"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast, Toaster } from "react-hot-toast";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiFileText,
  FiGrid,
  FiList,
  FiEye,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiPackage,
  FiTrendingUp,
  FiDollarSign,
  FiUsers,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiStar,
  FiHeart,
  FiShare2
} from "react-icons/fi";
import {
  FaCar,
  FaMotorcycle,
  FaBolt,
  FaTruckLoading,
  FaCogs,
} from "react-icons/fa";
import AuthCheck from "../components/AuthCheck";

interface Vehicle {
  _id: string;
  type: string;
  brand: string;
  model: string;
  price: number;
  engineNumber: string;
  chassisNumber: string;
  partner: string;
  partnerCNIC: string;
  color?: string;
  dateAdded?: string;
  status: "Stock In" | "Stock Out";
  showroom?: string;
}

const vehicleTypes = ["Car", "Bike", "Electric Bike", "Rickshaw", "Loader"];

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

export default function SearchPage() {
  const { data: session } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<Vehicle[]>([]);

  const [filters, setFilters] = useState({
    search: "",
    selectedProvider: "",
    cnic: "",
    engine: "",
    chassis: "",
    brand: "",
    type: "",
    minPrice: "",
    maxPrice: "",
    color: "",
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc"
  });

  // Stats calculation
  const stats = {
    totalVehicles: vehicles.length,
    totalProviders: providers.length,
    averagePrice: vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + v.price, 0) / vehicles.length) : 0,
    availableVehicles: vehicles.filter(v => v.status === "Stock In").length
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vehicles, filters]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/vehicles/seller");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch vehicles");
      }
      const data = await response.json();
      setVehicles(data);
      
      // Extract unique providers
      const uniqueProviders = [
        ...new Set(
          data
            .map((v: Vehicle) => v.partnerCNIC)
            .filter((cnic: string) => cnic && cnic !== "N/A")
        ),
      ] as string[];
      setProviders(uniqueProviders);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = vehicles.filter((vehicle) => {
      const matchesSearch = 
        vehicle.brand.toLowerCase().includes(filters.search.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(filters.search.toLowerCase()) ||
        vehicle.partner.toLowerCase().includes(filters.search.toLowerCase()) ||
        vehicle.engineNumber.toLowerCase().includes(filters.search.toLowerCase());

      const matchesProvider = !filters.selectedProvider || vehicle.partnerCNIC === filters.selectedProvider;
      const matchesCNIC = !filters.cnic || vehicle.partnerCNIC?.includes(filters.cnic);
      const matchesEngine = !filters.engine || vehicle.engineNumber?.includes(filters.engine);
      const matchesChassis = !filters.chassis || vehicle.chassisNumber?.includes(filters.chassis);
      const matchesBrand = !filters.brand || vehicle.brand?.toLowerCase().includes(filters.brand.toLowerCase());
      const matchesType = !filters.type || vehicle.type === filters.type;
      const matchesColor = !filters.color || vehicle.color?.toLowerCase().includes(filters.color.toLowerCase());
      
      const matchesMinPrice = !filters.minPrice || vehicle.price >= Number(filters.minPrice);
      const matchesMaxPrice = !filters.maxPrice || vehicle.price <= Number(filters.maxPrice);

      return matchesSearch && matchesProvider && matchesCNIC && matchesEngine && 
             matchesChassis && matchesBrand && matchesType && matchesColor &&
             matchesMinPrice && matchesMaxPrice;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case "price":
          aValue = a.price;
          bValue = b.price;
          break;
        case "brand":
          aValue = a.brand.toLowerCase();
          bValue = b.brand.toLowerCase();
          break;
        case "date":
        default:
          aValue = new Date(a.dateAdded || "").getTime();
          bValue = new Date(b.dateAdded || "").getTime();
          break;
      }

      if (filters.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredVehicles(filtered);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      selectedProvider: "",
      cnic: "",
      engine: "",
      chassis: "",
      brand: "",
      type: "",
      minPrice: "",
      maxPrice: "",
      color: "",
      sortBy: "date",
      sortOrder: "desc"
    });
  };

  const exportToExcel = () => {
    const cleanData = filteredVehicles.map(({
      type, brand, model, price, engineNumber, chassisNumber, partner, partnerCNIC, color
    }) => ({
      Type: type,
      Brand: brand,
      Model: model,
      Price: price,
      "Engine Number": engineNumber,
      "Chassis Number": chassisNumber,
      "Seller/Provider": partner,
      "Provider CNIC": partnerCNIC,
      Color: color || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicle Search Results");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, "vehicle-search-results.xlsx");
    toast.success("Excel file exported successfully!");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Vehicle Search Results", 20, 20);
    
    const tableData = filteredVehicles.map(v => [
      v.type,
      v.brand,
      v.model,
      `PKR ${v.price.toLocaleString()}`,
      v.engineNumber,
      v.chassisNumber,
      v.partner,
      v.partnerCNIC
    ]);

    autoTable(doc, {
      head: [["Type", "Brand", "Model", "Price", "Engine #", "Chassis #", "Seller", "Seller CNIC"]],
      body: tableData,
      startY: 30,
    });

    doc.save("vehicle-search-results.pdf");
    toast.success("PDF exported successfully!");
  };

  const toggleFavorite = (vehicleId: string) => {
    setFavorites(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const toggleCompare = (vehicle: Vehicle) => {
    setCompareList(prev => {
      const exists = prev.find(v => v._id === vehicle._id);
      if (exists) {
        return prev.filter(v => v._id !== vehicle._id);
      } else if (prev.length < 3) {
        return [...prev, vehicle];
      } else {
        toast.error("You can compare up to 3 vehicles only");
        return prev;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vehicles...</p>
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
                <h1 className="text-3xl font-bold gradient-text mb-2">Vehicle Search</h1>
                <p className="text-gray-600">Find vehicles by seller and specifications</p>
              </div>
              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <FiFilter className="text-lg" />
                  <span>Filters</span>
                  {showFilters ? <FiChevronUp /> : <FiChevronDown />}
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportToPDF}
                  className="btn btn-danger flex items-center space-x-2"
                >
                  <FiFileText className="text-lg" />
                  <span>PDF</span>
                </motion.button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Vehicles"
                value={stats.totalVehicles}
                icon={FiPackage}
                color="blue"
                delay={0.1}
              />
              <StatsCard
                title="Providers"
                value={stats.totalProviders}
                icon={FiUsers}
                color="green"
                delay={0.2}
              />
              <StatsCard
                title="Average Price"
                value={`PKR ${stats.averagePrice.toLocaleString()}`}
                icon={FiDollarSign}
                color="purple"
                delay={0.3}
              />
              <StatsCard
                title="Available"
                value={stats.availableVehicles}
                icon={FiTrendingUp}
                color="orange"
                delay={0.4}
              />
            </div>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card mb-6"
          >
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search by brand, model, seller, or engine number..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-12 pr-4 py-4 text-lg border-0 focus:outline-none focus:ring-0 bg-transparent"
              />
            </div>
          </motion.div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="card mb-6 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                    <button
                      onClick={clearFilters}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                      <select
                        value={filters.selectedProvider}
                        onChange={(e) => setFilters({ ...filters, selectedProvider: e.target.value })}
                        className="input"
                      >
                        <option value="">All Providers</option>
                        {providers.map((cnic) => (
                          <option key={cnic} value={cnic}>{cnic}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                      <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="input"
                      >
                        <option value="">All Types</option>
                        {vehicleTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                      <input
                        type="text"
                        placeholder="Enter brand"
                        value={filters.brand}
                        onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                      <input
                        type="text"
                        placeholder="Enter color"
                        value={filters.color}
                        onChange={(e) => setFilters({ ...filters, color: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Price (PKR)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (PKR)</label>
                      <input
                        type="number"
                        placeholder="1000000"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Engine Number</label>
                      <input
                        type="text"
                        placeholder="Engine number"
                        value={filters.engine}
                        onChange={(e) => setFilters({ ...filters, engine: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={`${filters.sortBy}-${filters.sortOrder}`}
                        onChange={(e) => {
                          const [sortBy, sortOrder] = e.target.value.split('-');
                          setFilters({ ...filters, sortBy, sortOrder: sortOrder as "asc" | "desc" });
                        }}
                        className="input"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="brand-asc">Brand: A to Z</option>
                        <option value="brand-desc">Brand: Z to A</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {filteredVehicles.length} Vehicle{filteredVehicles.length !== 1 ? 's' : ''} Found
              </h2>
              {compareList.length > 0 && (
                <button
                  onClick={() => setCompareList([])}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear Compare ({compareList.length})
                </button>
              )}
            </div>

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
          </motion.div>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card bg-red-50 border-red-200 text-center py-8 mb-6"
            >
              <FiAlertCircle className="text-red-500 text-4xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Vehicles</h3>
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

          {/* Results */}
          {!error && (
            <>
              {filteredVehicles.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card text-center py-12"
                >
                  <FiSearch className="text-gray-400 text-6xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Vehicles Found</h3>
                  <p className="text-gray-500 mb-6">
                    Try adjusting your search criteria or filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="btn btn-primary"
                  >
                    Clear Filters
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredVehicles.map((vehicle, index) => (
                        <VehicleCard
                          key={vehicle._id}
                          vehicle={vehicle}
                          index={index}
                          isFavorite={favorites.includes(vehicle._id)}
                          isInCompare={compareList.some(v => v._id === vehicle._id)}
                          onView={() => setSelectedVehicle(vehicle)}
                          onToggleFavorite={() => toggleFavorite(vehicle._id)}
                          onToggleCompare={() => toggleCompare(vehicle)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="card overflow-hidden">
                      <VehicleTable
                        vehicles={filteredVehicles}
                        favorites={favorites}
                        compareList={compareList}
                        onView={(vehicle) => setSelectedVehicle(vehicle)}
                        onToggleFavorite={toggleFavorite}
                        onToggleCompare={toggleCompare}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>

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
  isFavorite,
  isInCompare,
  onView,
  onToggleFavorite,
  onToggleCompare
}: { 
  vehicle: Vehicle; 
  index: number; 
  isFavorite: boolean;
  isInCompare: boolean;
  onView: () => void;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card card-hover group relative overflow-hidden"
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className={`badge ${vehicle.status === "Stock In" ? "badge-success" : "badge-secondary"}`}>
          {vehicle.status}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`p-2 rounded-full transition-all ${
            isFavorite 
              ? 'bg-red-500 text-white' 
              : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
          }`}
        >
          <FiHeart className="text-sm" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare();
          }}
          className={`p-2 rounded-full transition-all ${
            isInCompare 
              ? 'bg-blue-500 text-white' 
              : 'bg-white/80 text-gray-600 hover:bg-blue-500 hover:text-white'
          }`}
        >
          <FiSettings className="text-sm" />
        </button>
      </div>

      <div className="cursor-pointer" onClick={onView}>
        {/* Vehicle Icon */}
        <div className="flex items-center justify-center py-8 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className={`w-16 h-16 bg-gradient-to-r ${getVehicleColor(vehicle.type)} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            {getVehicleIcon(vehicle.type)}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-sm text-gray-500">{vehicle.type}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Price:</span>
              <span className="font-semibold text-gray-900">PKR {vehicle.price.toLocaleString()}</span>
            </div>
            {vehicle.color && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Color:</span>
                <span className="text-gray-700">{vehicle.color}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Engine:</span>
              <span className="text-gray-700 font-mono text-xs">{vehicle.engineNumber}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Seller</p>
                <p className="text-sm font-medium text-gray-900">{vehicle.partner}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-700 transition-colors">
                  <FiEye className="text-lg" />
                </button>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <FiShare2 className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Vehicle Table Component
function VehicleTable({ 
  vehicles, 
  favorites,
  compareList,
  onView,
  onToggleFavorite,
  onToggleCompare
}: { 
  vehicles: Vehicle[]; 
  favorites: string[];
  compareList: Vehicle[];
  onView: (vehicle: Vehicle) => void;
  onToggleFavorite: (vehicleId: string) => void;
  onToggleCompare: (vehicle: Vehicle) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engine #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
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
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">{vehicle.partner}</div>
                  <div className="text-sm text-gray-500">{vehicle.partnerCNIC}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`badge ${vehicle.status === "Stock In" ? "badge-success" : "badge-secondary"}`}>
                  {vehicle.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onView(vehicle)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <FiEye className="text-lg" />
                  </button>
                  <button
                    onClick={() => onToggleFavorite(vehicle._id)}
                    className={`transition-colors ${
                      favorites.includes(vehicle._id)
                        ? 'text-red-500 hover:text-red-600'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <FiHeart className="text-lg" />
                  </button>
                  <button
                    onClick={() => onToggleCompare(vehicle)}
                    className={`transition-colors ${
                      compareList.some(v => v._id === vehicle._id)
                        ? 'text-blue-500 hover:text-blue-600'
                        : 'text-gray-400 hover:text-blue-500'
                    }`}
                  >
                    <FiSettings className="text-lg" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
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
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiX className="text-xl" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                {getVehicleIcon(vehicle.type)}
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {vehicle.brand} {vehicle.model}
                </h2>
                <p className="text-blue-100">{vehicle.type}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price and Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Price</p>
              <p className="text-3xl font-bold text-gray-900">PKR {vehicle.price.toLocaleString()}</p>
            </div>
            <span className={`badge ${vehicle.status === "Stock In" ? "badge-success" : "badge-secondary"} text-lg px-4 py-2`}>
              {vehicle.status}
            </span>
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900">{vehicle.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Brand</label>
                  <p className="text-gray-900">{vehicle.brand}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Model</label>
                  <p className="text-gray-900">{vehicle.model}</p>
                </div>
                {vehicle.color && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Color</label>
                    <p className="text-gray-900">{vehicle.color}</p>
                  </div>
                )}
                {vehicle.dateAdded && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date Added</label>
                    <p className="text-gray-900">{new Date(vehicle.dateAdded).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Technical Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Engine Number</label>
                  <p className="text-gray-900 font-mono">{vehicle.engineNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Chassis Number</label>
                  <p className="text-gray-900 font-mono">{vehicle.chassisNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Seller Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Seller/Provider</label>
                <p className="text-gray-900">{vehicle.partner}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Provider CNIC</label>
                <p className="text-gray-900 font-mono">{vehicle.partnerCNIC}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Close
            </button>
            <button className="btn btn-primary flex items-center space-x-2">
              <FiShare2 className="text-lg" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}