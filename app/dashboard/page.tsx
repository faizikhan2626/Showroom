// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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

const COLORS = [
  "#4CAF50",
  "#2196F3",
  "#FFC107",
  "#9C27B0",
  "#FF5722",
  "#FF9800",
  "#E91E63",
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [selectedStockType, setSelectedStockType] = useState("All");
  const [selectedSalesType, setSelectedSalesType] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState("All");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockVehicleTypes, setStockVehicleTypes] = useState<string[]>(["All"]);
  const [salesVehicleTypes, setSalesVehicleTypes] = useState<string[]>(["All"]);
  const [missingVehicleTypeWarning, setMissingVehicleTypeWarning] =
    useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (status === "loading") return;
        if (!session || !session.user) {
          throw new Error("No user session available");
        }
        console.log("Session data:", session.user);
        if (session.user.role !== "admin" && !session.user.showroomId) {
          throw new Error("Showroom ID missing for non-admin user");
        }
        const query = new URLSearchParams({
          userId: session.user.id,
          role: session.user.role || "showroom",
          ...(session.user.showroomId && {
            showroomId: session.user.showroomId,
          }),
        });
        console.log("Fetching dashboard data with query:", query.toString());
        const res = await fetch(`/api/dashboard?${query.toString()}`);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Dashboard fetch error:", errorData);
          throw new Error(
            errorData.message || "Failed to fetch dashboard data"
          );
        }
        const result = await res.json();
        console.log("Dashboard data:", result);

        const hasMissingVehicleType = result.sales.some(
          (s: any) => !s.vehicleType
        );
        setMissingVehicleTypeWarning(hasMissingVehicleType);

        const stockTypes = [
          "All",
          ...new Set(result.vehicles.map((v: any) => v.type).filter(Boolean)),
        ];
        const salesTypes = [
          "All",
          ...new Set(
            result.sales
              .map((s: any) => s.vehicleType || "Unknown")
              .filter(Boolean)
          ),
        ];

        setStockVehicleTypes(stockTypes);
        setSalesVehicleTypes(salesTypes);
        setData(result);
      } catch (err: any) {
        console.error("Fetch error:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status]);

  // Apply filters to the data
  const filteredData = data
    ? {
        ...data,
        sales: data.sales.filter((s: any) => {
          const typeMatch =
            selectedSalesType === "All" || s.vehicleType === selectedSalesType;
          const paymentMatch =
            selectedPayment === "All" || s.paymentType === selectedPayment;
          return typeMatch && paymentMatch;
        }),
        vehicles: data.vehicles.filter((v: any) => {
          return selectedStockType === "All" || v.type === selectedStockType;
        }),
      }
    : null;

  // Process the filtered data for charts
  const processedData = filteredData
    ? {
        totalSales: filteredData.totalSales || filteredData.sales.length,
        totalRevenue:
          filteredData.totalRevenue ||
          filteredData.sales.reduce(
            (sum: number, sale: any) => sum + (sale.totalAmount || 0),
            0
          ),
        currentStock:
          filteredData.currentStock ||
          filteredData.vehicles.filter((v: any) => v.status === "Stock In")
            .length,
        totalStockValue: filteredData.vehicles.reduce(
          (sum: number, vehicle: any) => sum + (vehicle.price || 0),
          0
        ),
        totalDue: filteredData.sales.reduce(
          (sum: number, sale: any) => sum + (sale.dueAmount || 0),
          0
        ),
        totalInstallmentSales: filteredData.sales.filter(
          (s: any) => s.paymentType === "Installment"
        ).length,
        monthlySales: filteredData.sales.reduce((acc: any, sale: any) => {
          const date = new Date(sale.createdAt || sale.saleDate);
          const month = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;
          if (!acc[month]) acc[month] = { month, count: 0, revenue: 0 };
          acc[month].count += sale.quantity || 1;
          acc[month].revenue += sale.totalAmount || 0;
          return acc;
        }, {}),
        salesByType: filteredData.sales.reduce((acc: any, sale: any) => {
          const type = sale.vehicleType || "Unknown";
          if (!acc[type]) acc[type] = { name: type, value: 0 };
          acc[type].value += sale.quantity || 1;
          return acc;
        }, {}),
        paymentDistribution: filteredData.sales.reduce(
          (acc: any, sale: any) => {
            const pt = sale.paymentType || "Unknown";
            if (!acc[pt]) acc[pt] = { name: pt, value: 0 };
            acc[pt].value += sale.quantity || 1;
            return acc;
          },
          {}
        ),
        stockByType: filteredData.vehicles.reduce((acc: any, vehicle: any) => {
          const type = vehicle.type || "Unknown";
          if (!acc[type]) acc[type] = { name: type, value: 0 };
          acc[type].value += 1;
          return acc;
        }, {}),
        stockByPartner: filteredData.vehicles.reduce(
          (acc: any, vehicle: any) => {
            const partner = vehicle.partners?.[0] || "Unknown";
            if (!acc[partner])
              acc[partner] = { name: partner, count: 0, value: 0 };
            acc[partner].count += 1;
            acc[partner].value += vehicle.price || 0;
            return acc;
          },
          {}
        ),
      }
    : null;

  const paymentTypes = ["All", "Cash", "Card", "Installment"];

  if (status === "loading") return <div className="p-6">Loading...</div>;
  if (error)
    return (
      <div className="p-6 text-red-500">
        <p>Error: {error}</p>
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );

  return (
    <AuthCheck>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">
          {session?.user.role === "admin"
            ? "Admin Dashboard"
            : `Dashboard - ${session?.user.showroomName || "Showroom"}`}{" "}
          {/* Use showroomName for display */}
        </h1>

        {missingVehicleTypeWarning && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
            Warning: Some sales records are missing vehicleType. This may affect
            reporting accuracy.
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm mb-1">Sales Vehicle Type</label>
            <select
              className="border p-2 rounded"
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
            <label className="block text-sm mb-1">Stock Vehicle Type</label>
            <select
              className="border p-2 rounded"
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
            <label className="block text-sm mb-1">Payment Type</label>
            <select
              className="border p-2 rounded"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card title="Total Sales" value={processedData?.totalSales ?? 0} />
          <Card
            title="Total Revenue"
            value={`PKR ${(processedData?.totalRevenue ?? 0).toLocaleString()}`}
          />
          <Card
            title="Current Stock"
            value={processedData?.currentStock ?? 0}
          />
          <Card
            title="Total Stock Value"
            value={`PKR ${(
              processedData?.totalStockValue ?? 0
            ).toLocaleString()}`}
          />
          <Card
            title="Due Installments"
            value={`PKR ${(processedData?.totalDue ?? 0).toLocaleString()}`}
          />
          <Card
            title="Installment Sales"
            value={processedData?.totalInstallmentSales ?? 0}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Monthly Sales Summary">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.values(processedData?.monthlySales ?? {})}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#4CAF50" name="Units Sold" />
                <Bar dataKey="revenue" fill="#2196F3" name="Revenue (PKR)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sales by Vehicle Type">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.values(processedData?.salesByType ?? {})}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    name ? `${name} ${(percent * 100).toFixed(0)}%` : "No Data"
                  }
                >
                  {Object.values(processedData?.salesByType ?? {}).map(
                    (entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Legend />
                <Tooltip formatter={(value) => [`${value} sales`, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sales by Payment Type">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.values(processedData?.paymentDistribution ?? {})}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    name ? `${name} ${(percent * 100).toFixed(0)}%` : "No Data"
                  }
                >
                  {Object.values(processedData?.paymentDistribution ?? {}).map(
                    (entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Legend />
                <Tooltip formatter={(value) => [`${value} sales`, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Stock by Vehicle Type">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.values(processedData?.stockByType ?? {})}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    name ? `${name} ${(percent * 100).toFixed(0)}%` : "No Data"
                  }
                >
                  {Object.values(processedData?.stockByType ?? {}).map(
                    (entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Legend />
                <Tooltip
                  formatter={(value) => [`${value} vehicles`, "Count"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Stock by Partner">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={Object.values(processedData?.stockByPartner ?? {})}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#4CAF50" name="Vehicles" />
                <Bar dataKey="value" fill="#2196F3" name="Value (PKR)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </AuthCheck>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <p className="text-gray-500 text-sm mb-1">{title}</p>
      <h2 className="text-xl font-bold">{value}</h2>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}
