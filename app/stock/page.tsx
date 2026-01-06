"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast, Toaster } from "react-hot-toast";
import {
  FiPlus,
  FiPackage,
  FiTrendingUp,
  FiDollarSign,
  FiFilter,
  FiDownload,
  FiGrid,
  FiList,
  FiSearch,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiFileText,
  FiCalendar,
  FiUser,
  FiTag,
  FiSettings
} from "react-icons/fi";
import {
  FaCar,
  FaMotorcycle,
  FaBolt,
  FaTruckLoading,
  FaCogs,
} from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import AuthCheck from "../components/AuthCheck";

type Vehicle = {
  _id?: string;
  type: "Car" | "Bike" | "Rickshaw" | "Loader" | "Electric Bike";
  brand: string;
  model: string;
  price: number;
  color: string;
  status: "Stock In" | "Stock Out";
  engineNumber: string;
  chassisNumber: string;
  partner: string;
  partnerCNIC: string;
  showroom: string;
  showroomId: string;
  dateAdded: string;
};

const vehicleTypes = ["Car", "Bike", "Rickshaw", "Loader", "Electric Bike"];

const getVehicleIcon = (type: string) => {
  const iconClass = "text-2xl";
  switch (type) {
    case "Car": return <FaCar className={`${iconClass} text-blue-500`} />;
    case "Bike": return <FaMotorcycle className={`${iconClass} text-green-500`} />;
    case "Electric Bike": return <FaBolt className={`${iconClass} text-yellow-500`} />;
    case "Loader": return <FaTruckLoading className={`${iconClass} text-purple-500`} />;
    case "Rickshaw": return <FaCogs className={`${iconClass} text-orange-500`} />;
    default: return <FiPackage className={`${iconClass} text-gray-500`} />;
  }
};

const getVehicleColor = (type: string) => {
  switch (type) {
    case "Car": return "from-blue-500 to-blue-600";
    case "Bike": return "from-green-500 to-green-600";
    case "Electric Bike": return "from-yellow-500 to-yellow-600";
    case "Loader": return "from-purple-500 to-purple-600";
    case "Rickshaw": return "from-orange-500 to-orange-600";
    default: return "from-gray-500 to-gray-600";
  }
};

export default function StockPage() {
  const { data: session, status } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("dateAdded");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [form, setForm] = useState({
    type: "Bike" as Vehicle["type"],
    brand: "",
    model: "",
    price: 0,
    color: "",
    engineNumber: "",
    chassisNumber: "",
    partner: "",
    partnerCNIC: "",
  });

  // Stats calculation
  const stats = {
    total: vehicles.length,
    totalValue: vehicles.reduce((sum, v) => sum + v.price, 0),
    byType: vehicleTypes.reduce((acc, type) => {
      acc[type] = vehicles.filter(v => v.type === type).length;
      return acc;
    }, {} as Record<string, number>),
    recentlyAdded: vehicles.filter(v => {
      const addedDate = new Date(v.dateAdded);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return addedDate > weekAgo;
    }).length
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.showroomId) {
      fetchVehicles();
    }
  }, [status, session]);

  useEffect(() => {
    filterAndSortVehicles();
  }, [vehicles, searchTerm, filterType, sortBy, sortOrder]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/custom?showroomId=${session?.user?.showroomId}`);
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      const data = await response.json();
      setVehicles(data);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVehicles = () => {
    let filtered = vehicles.filter(vehicle => {
      const matchesSearch = 
        vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.engineNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.partner.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "All" || vehicle.type === filterType;
      
      return matchesSearch && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'brand':
          aValue = a.brand.toLowerCase();
          bValue = b.brand.toLowerCase();
          break;
        case 'dateAdded':
        default:
          aValue = new Date(a.dateAdded).getTime();
          bValue = new Date(b.dateAdded).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredVehicles(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.brand || !form.model || !form.engineNumber || !form.chassisNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/vehicles/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          showroomId: session?.user?.showroomId,
          status: "Stock In",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add vehicle");
      }

      toast.success("Vehicle added successfully!");
      setForm({
        type: "Bike",
        brand: "",
        model: "",
        price: 0,
        color: "",
        engineNumber: "",
        chassisNumber: "",
        partner: "",
        partnerCNIC: "",
      });
      setShowAddForm(false);
      fetchVehicles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Stock Report", 20, 20);
    
    const tableData = filteredVehicles.map(v => [
      v.type,
      v.brand,
      v.model,
      `PKR ${v.price.toLocaleString()}`,
      v.color,
      v.engineNumber,
      v.partner
    ]);

    autoTable(doc, {
      head: [['Type', 'Brand', 'Model', 'Price', 'Color', 'Engine #', 'Partner']],
      body: tableData,
      startY: 30,
    });

    doc.save('stock-report.pdf');
    toast.success("PDF exported successfully!");
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredVehicles);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "stock-report.xlsx");
    toast.success("Excel file exported successfully!");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthCheck>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold gradient-text mb-2">Stock Management</h1>
                <p className="text-gray-600">Manage your vehicle inventory</p>
              </div>
              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <FiPlus className="text-lg" />
                  <span>Add Vehicle</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportToPDF}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <FiFileText className="text-lg" />
                  <span>PDF</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportToExcel}
                  className="btn btn-success flex items-center space-x-2"
                >
                  <FiDownload className="text-lg" />
                  <span>Excel</span>
                </motion.button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Vehicles"
                value={stats.total}
                icon={FiPackage}
                color="blue"
                delay={0.1}
              />
              <StatsCard
                title="Total Value"
                value={`PKR ${stats.totalValue.toLocaleString()}`}
                icon={FiDollarSign}
                color="green"
                delay={0.2}
              />
              <StatsCard
                title="Recently Added"
                value={stats.recentlyAdded}
                icon={FiTrendingUp}
                color="purple"
                delay={0.3}
              />
              <StatsCard
                title="Vehicle Types"
                value={Object.keys(stats.byType).filter(type => stats.byType[type] > 0).length}
                icon={FiSettings}
                color="orange"
                delay={0.4}
              />
            </div>
          </motion.div>

          {/* Filters and Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search vehicles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="All">All Types</option>
                  {vehicleTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="dateAdded-desc">Newest First</option>
                  <option value="dateAdded-asc">Oldest First</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="brand-asc">Brand: A to Z</option>
                  <option value="brand-desc">Brand: Z to A</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FiGrid className="text-lg" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FiList className="text-lg" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading vehicles...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card bg-red-50 border-red-200 text-center py-8"
            >
              <FiAlertCircle className="text-red-500 text-4xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Stock</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchVehicles}
                className="btn btn-danger flex items-center space-x-2 mx-auto"
              >
                <FiRefreshCw className="text-lg" />
                <span>Retry</span>
              </button>
            </motion.div>
          )}

          {/* Vehicles Display */}
          {!loading && !error && (
            <>
              {filteredVehicles.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card text-center py-12"
                >
                  <FiPackage className="text-gray-400 text-6xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Vehicles Found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || filterType !== "All" 
                      ? "Try adjusting your search or filters" 
                      : "Start by adding your first vehicle to stock"}
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary flex items-center space-x-2 mx-auto"
                  >
                    <FiPlus className="text-lg" />
                    <span>Add Vehicle</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredVehicles.map((vehicle, index) => (
                        <VehicleCard
                          key={vehicle._id}
                          vehicle={vehicle}
                          index={index}
                          onView={() => setSelectedVehicle(vehicle)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="card overflow-hidden">
                      <VehicleTable
                        vehicles={filteredVehicles}
                        onView={(vehicle) => setSelectedVehicle(vehicle)}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Add Vehicle Modal */}
        <AnimatePresence>
          {showAddForm && (
            <AddVehicleModal
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onClose={() => setShowAddForm(false)}
            />
          )}
        </AnimatePresence>

        {/* Vehicle Details Modal */}
        <AnimatePresence>
          {selectedVehicle && (
            <VehicleDetailsModal
              vehicle={selectedVehicle}
              onClose={() => setSelectedVehicle(null)}
            />
          )}
        </AnimatePresence>

        <Toaster position="top-right" />
      </div>
    </AuthCheck>
  );
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  delay 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string; 
  delay: number;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="card card-hover group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="text-white text-xl" />
        </div>
      </div>
    </motion.div>
  );
}

// Vehicle Card Component
function VehicleCard({ 
  vehicle, 
  index, 
  onView 
}: { 
  vehicle: Vehicle; 
  index: number; 
  onView: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card card-hover group cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-r ${getVehicleColor(vehicle.type)} rounded-xl flex items-center justify-center`}>
          {getVehicleIcon(vehicle.type)}
        </div>
        <span className="badge badge-success">{vehicle.status}</span>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {vehicle.brand} {vehicle.model}
      </h3>
      <p className="text-gray-600 text-sm mb-3">{vehicle.type}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Price:</span>
          <span className="font-semibold text-gray-900">PKR {vehicle.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Color:</span>
          <span className="text-gray-700">{vehicle.color}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Engine:</span>
          <span className="text-gray-700 font-mono text-xs">{vehicle.engineNumber}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <FiUser className="text-xs" />
          <span>{vehicle.partner}</span>
        </div>
        <button className="text-blue-600 hover:text-blue-700 transition-colors">
          <FiEye className="text-lg" />
        </button>
      </div>
    </motion.div>
  );
}

// Vehicle Table Component
function VehicleTable({ 
  vehicles, 
  onView 
}: { 
  vehicles: Vehicle[]; 
  onView: (vehicle: Vehicle) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engine #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {vehicles.map((vehicle, index) => (
            <motion.tr
              key={vehicle._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className={`w-10 h-10 bg-gradient-to-r ${getVehicleColor(vehicle.type)} rounded-lg flex items-center justify-center mr-3`}>
                    {getVehicleIcon(vehicle.type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {vehicle.brand} {vehicle.model}
                    </div>
                    <div className="text-sm text-gray-500">{vehicle.type}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                PKR {vehicle.price.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                {vehicle.engineNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {vehicle.partner}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="badge badge-success">{vehicle.status}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onView(vehicle)}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <FiEye className="text-lg" />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Add Vehicle Modal Component
function AddVehicleModal({ 
  form, 
  setForm, 
  onSubmit, 
  onClose 
}: { 
  form: any; 
  setForm: any; 
  onSubmit: (e: React.FormEvent) => void; 
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Add New Vehicle</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="text-xl text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Vehicle["type"] })}
                className="input"
                required
              >
                {vehicleTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand *
              </label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="input"
                placeholder="e.g., Honda, Toyota"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model *
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="input"
                placeholder="e.g., Civic, CD 70"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (PKR) *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="input"
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="input"
                placeholder="e.g., Red, Blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Engine Number *
              </label>
              <input
                type="text"
                value={form.engineNumber}
                onChange={(e) => setForm({ ...form, engineNumber: e.target.value })}
                className="input"
                placeholder="Engine number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chassis Number *
              </label>
              <input
                type="text"
                value={form.chassisNumber}
                onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })}
                className="input"
                placeholder="Chassis number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partner/Supplier
              </label>
              <input
                type="text"
                value={form.partner}
                onChange={(e) => setForm({ ...form, partner: e.target.value })}
                className="input"
                placeholder="Partner name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partner CNIC
              </label>
              <input
                type="text"
                value={form.partnerCNIC}
                onChange={(e) => setForm({ ...form, partnerCNIC: e.target.value })}
                className="input"
                placeholder="00000-0000000-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiCheck className="text-lg" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Vehicle Details Modal Component
function VehicleDetailsModal({ 
  vehicle, 
  onClose 
}: { 
  vehicle: Vehicle; 
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 bg-gradient-to-r ${getVehicleColor(vehicle.type)} rounded-xl flex items-center justify-center`}>
                {getVehicleIcon(vehicle.type)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {vehicle.brand} {vehicle.model}
                </h2>
                <p className="text-gray-600">{vehicle.type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="text-xl text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Price</label>
              <p className="text-lg font-semibold text-gray-900">PKR {vehicle.price.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p><span className="badge badge-success">{vehicle.status}</span></p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Color</label>
              <p className="text-gray-900">{vehicle.color}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date Added</label>
              <p className="text-gray-900">{new Date(vehicle.dateAdded).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div>
              <label className="text-sm font-medium text-gray-500">Engine Number</label>
              <p className="text-gray-900 font-mono">{vehicle.engineNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Chassis Number</label>
              <p className="text-gray-900 font-mono">{vehicle.chassisNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Partner/Supplier</label>
              <p className="text-gray-900">{vehicle.partner}</p>
            </div>
            {vehicle.partnerCNIC && (
              <div>
                <label className="text-sm font-medium text-gray-500">Partner CNIC</label>
                <p className="text-gray-900 font-mono">{vehicle.partnerCNIC}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}