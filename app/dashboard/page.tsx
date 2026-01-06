// components/DashboardPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import AuthCheck from "../components/AuthCheck";
import { jsPDF } from "jspdf";
import dynamic from "next/dynamic";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPackage,
  FiCreditCard,
  FiDownload,
  FiFileText,
  FiFilter,
  FiCalendar,
  FiAlertTriangle,
  FiRefreshCw,
  FiBarChart,
  FiActivity,
  FiUsers,
  FiShoppingCart
} from "react-icons/fi";

const autoTable = dynamic(() => import("jspdf-autotable").then(mod => ({ default: mod.default })), { ssr: false });

const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EF4444", // Red
  "#F97316", // Orange
  "#EC4899", // Pink
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [selectedStockType, setSelectedStockType] = useState("All");
  const [selectedSalesType, setSelectedSalesType] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockVehicleTypes, setStockVehicleTypes] = useState<string[]>(["All"]);
  const [salesVehicleTypes, setSalesVehicleTypes] = useState<string[]>(["All"]);
  const [missingVehicleTypeWarning, setMissingVehicleTypeWarning] = useState(false);
  const [missingDataWarning, setMissingDataWarning] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().slice(0, 10));
    setStartDate(thirtyDaysAgo.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (status === "loading") return;
        if (!session || !session.user) {
          throw new Error("No user session available");
        }
        
        const query = new URLSearchParams({
          userId: session.user.showroomId || "admin",
          role: session.user.role || "showroom",
          ...(session.user.showroomId && {
            showroomId: session.user.showroomId,
          }),
          startDate: startDate,
          endDate: endDate,
          salesType: selectedSalesType,
          stockType: selectedStockType,
          paymentType: selectedPayment,
        });
        
        const res = await fetch(`/api/dashboard?${query.toString()}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to fetch dashboard data");
        }
        
        const result = await res.json();

        // Sanitize data
        result.sales = result.sales.map((sale: any) => ({
          ...sale,
          date: sale.saleDate || null,
          amount: Number(sale.totalAmount) || 0,
          vehicleType: sale.vehicleType || "Unknown",
          paymentType: sale.paymentType || "Unknown",
          showroom: sale.showroomId?.showroomName || sale.showroom || "Unknown",
        }));

        result.vehicles = result.vehicles.map((vehicle: any) => ({
          ...vehicle,
          name: vehicle.type || "Unknown",
          showroom: vehicle.showroomId?.showroomName || vehicle.showroom || "Unknown",
          value: Number(vehicle.price) || 0,
        }));

        const stockTypes = ["All", ...new Set(result.vehicles.map((v: any) => v.type).filter(Boolean))] as string[];
        const salesTypes = ["All", ...new Set(result.sales.map((s: any) => s.vehicleType).filter(Boolean))] as string[];

        setStockVehicleTypes(stockTypes);
        setSalesVehicleTypes(salesTypes);
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status, startDate, endDate, selectedSalesType, selectedStockType, selectedPayment]);

  const processedData = data ? {
    totalSales: data.totalSales,
    totalRevenue: data.totalRevenue,
    currentStock: data.currentStock,
    totalStockValue: data.totalStockValue,
    totalDue: data.totalDue,
    totalInstallmentSales: data.totalInstallmentSales,
    monthlySales: data.monthlySales,
    salesByType: data.salesByType,
    paymentDistribution: data.paymentDistribution,
    stockByType: data.stockByType,
    stockByPartner: data.stockByPartner,
    sales: data.sales,
    vehicles: data.vehicles,
  } : null;

  const paymentTypes = ["All", "Cash", "Card", "Installment"];

  const generatePDF = async () => {
    if (!processedData) {
      alert("No data available to generate PDF.");
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      doc.text("Dashboard Report", 20, 20);
      doc.save(`dashboard-report-${startDate}-to-${endDate}.pdf`);
    } catch (error: any) {
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateExcel = async () => {
    if (!processedData) {
      alert("No data available to generate Excel.");
      return;
    }
    setIsGeneratingExcel(true);
    try {
      let csvContent = "Dashboard Report\n\n";
      csvContent += `Total Sales,${processedData.totalSales}\n`;
      csvContent += `Total Revenue,PKR ${processedData.totalRevenue}\n`;
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dashboard-report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Failed to generate Excel: ${error.message}`);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle className="text-red-600 text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary flex items-center space-x-2 mx-auto"
          >
            <FiRefreshCw className="text-lg" />
            <span>Retry</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const hasValidStockData = processedData?.vehicles?.some((vehicle: any) => vehicle.value > 0);

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold gradient-text mb-2">
                  {session?.user.role === "admin" ? "Admin Dashboard" : `Dashboard`}
                </h1>
                <p className="text-gray-600">
                  {session?.user.role === "admin" 
                    ? "Complete overview of all showrooms"
                    : `${session?.user.showroomName || "Showroom"} Analytics`}
                </p>
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
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generatePDF}
                  disabled={isGeneratingPDF || !processedData}
                  className="btn btn-danger flex items-center space-x-2 disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FiFileText className="text-lg" />
                  )}
                  <span>{isGeneratingPDF ? "Generating..." : "Export PDF"}</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generateExcel}
                  disabled={isGeneratingExcel || !processedData}
                  className="btn btn-success flex items-center space-x-2 disabled:opacity-50"
                >
                  {isGeneratingExcel ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FiDownload className="text-lg" />
                  )}
                  <span>{isGeneratingExcel ? "Generating..." : "Export Excel"}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="card mb-8 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <FiFilter className="text-blue-600 text-xl" />
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  </div>
                  <button
                    onClick={clearDateFilter}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                  >
                    <FiRefreshCw className="text-sm" />
                    <span>Clear Date Filter</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiCalendar className="inline mr-1" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiCalendar className="inline mr-1" />
                      End Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiShoppingCart className="inline mr-1" />
                      Sales Vehicle Type
                    </label>
                    <select
                      className="input"
                      value={selectedSalesType}
                      onChange={(e) => setSelectedSalesType(e.target.value)}
                    >
                      {salesVehicleTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiPackage className="inline mr-1" />
                      Stock Vehicle Type
                    </label>
                    <select
                      className="input"
                      value={selectedStockType}
                      onChange={(e) => setSelectedStockType(e.target.value)}
                    >
                      {stockVehicleTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiCreditCard className="inline mr-1" />
                      Payment Type
                    </label>
                    <select
                      className="input"
                      value={selectedPayment}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    >
                      {paymentTypes.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {(startDate || endDate) && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-center space-x-2">
                    <FiCalendar className="text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Showing data from {startDate || "beginning"} to {endDate || "now"}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <StatsCard
              title="Total Sales"
              value={processedData?.totalSales ?? 0}
              icon={FiTrendingUp}
              color="blue"
              delay={0.1}
            />
            <StatsCard
              title="Total Revenue"
              value={`PKR ${(processedData?.totalRevenue ?? 0).toLocaleString()}`}
              icon={FiDollarSign}
              color="green"
              delay={0.2}
            />
            <StatsCard
              title="Current Stock"
              value={processedData?.currentStock ?? 0}
              icon={FiPackage}
              color="purple"
              delay={0.3}
            />
            <StatsCard
              title="Stock Value"
              value={`PKR ${(processedData?.totalStockValue ?? 0).toLocaleString()}`}
              icon={FiBarChart}
              color="orange"
              delay={0.4}
            />
            <StatsCard
              title="Due Installments"
              value={`PKR ${(processedData?.totalDue ?? 0).toLocaleString()}`}
              icon={FiCreditCard}
              color="red"
              delay={0.5}
            />
            <StatsCard
              title="Installment Sales"
              value={processedData?.totalInstallmentSales ?? 0}
              icon={FiUsers}
              color="indigo"
              delay={0.6}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Monthly Sales Summary" icon={FiBarChart} delay={0.7}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.values(processedData?.monthlySales ?? {})}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Units Sold" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue (PKR)" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Sales by Vehicle Type" icon={FiActivity} delay={0.8}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.values(processedData?.salesByType || {})}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      name && `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {Object.values(processedData?.salesByType || {}).map(
                      (entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => `${value} sales`} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Payment Distribution" icon={FiCreditCard} delay={0.9}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.values(processedData?.paymentDistribution || {})}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      name && `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {Object.values(processedData?.paymentDistribution || {}).map(
                      (entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => `${value} sales`} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Stock by Vehicle Type" icon={FiPackage} delay={1.0}>
              {hasValidStockData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.values(processedData?.stockByType || {})}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        name && `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {Object.values(processedData?.stockByType || {}).map(
                        (entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => `${value} units`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  <div className="text-center">
                    <FiPackage className="text-4xl mx-auto mb-2 opacity-50" />
                    <p>No valid stock data available</p>
                  </div>
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
}

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
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
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

function ChartCard({
  title,
  icon: Icon,
  children,
  delay,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="card card-hover"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Icon className="text-blue-600 text-xl" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}