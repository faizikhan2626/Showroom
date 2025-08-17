// components/DashboardPage.tsx
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
import { jsPDF } from "jspdf";
import dynamic from "next/dynamic";

const autoTable = dynamic(() => import("jspdf-autotable"), { ssr: false });

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockVehicleTypes, setStockVehicleTypes] = useState<string[]>(["All"]);
  const [salesVehicleTypes, setSalesVehicleTypes] = useState<string[]>(["All"]);
  const [missingVehicleTypeWarning, setMissingVehicleTypeWarning] =
    useState(false);
  const [missingDataWarning, setMissingDataWarning] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

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
          startDate: startDate,
          endDate: endDate,
          salesType: selectedSalesType,
          stockType: selectedStockType,
          paymentType: selectedPayment,
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
        console.log("Raw dashboard data:", result);

        // Sanitize sales data
        result.sales = result.sales.map((sale: any) => {
          if (!sale.date) console.warn(`Missing sale date for sale:`, sale);
          if (!sale.amount || isNaN(Number(sale.amount)))
            console.warn(`Invalid or missing sale amount:`, sale);
          return {
            ...sale,
            date: sale.saleDate || null,
            amount: Number(sale.totalAmount) || 0,
            vehicleType: sale.vehicleType || "Unknown",
            paymentType: sale.paymentType || "Unknown",
            showroom:
              sale.showroomId?.showroomName || sale.showroom || "Unknown",
          };
        });

        // Sanitize vehicles data
        result.vehicles = result.vehicles.map((vehicle: any) => {
          if (!vehicle.value || isNaN(Number(vehicle.value)))
            console.warn(
              `Vehicle ${vehicle._id || "unknown"} has invalid value: ${
                vehicle.value
              }`
            );
          return {
            ...vehicle,
            // Note: vehicle.name is not available in the API response.
            // You may need to fetch specific vehicle names (e.g., "Honda CD 70")
            // using vehicleId or maintain a mapping of vehicleId to vehicle names.
            name: vehicle.type || "Unknown", // Fallback to type for now
            showroom:
              vehicle.showroomId?.showroomName || vehicle.showroom || "Unknown",
            value: Number(vehicle.price) || 0,
          };
        });

        // Check for missing critical data
        const warnings: string[] = [];
        const allSalesMissingDate = result.sales.every(
          (sale: any) =>
            !sale.saleDate ||
            new Date(sale.saleDate).toString() === "Invalid Date"
        );
        const allSalesMissingAmount = result.sales.every(
          (sale: any) => !sale.totalAmount || isNaN(Number(sale.totalAmount))
        );
        const allVehiclesMissingValue =
          result.vehicles.length > 0 &&
          result.vehicles.every(
            (vehicle: any) => !vehicle.price || isNaN(Number(vehicle.price))
          );

        if (allSalesMissingDate)
          warnings.push("All sales records are missing valid dates.");
        if (allSalesMissingAmount)
          warnings.push("All sales records are missing valid amounts.");
        if (allVehiclesMissingValue)
          warnings.push("All stock records are missing valid values.");
        setMissingDataWarning(warnings);

        const hasMissingVehicleType = result.sales.some(
          (s: any) => s.vehicleType === "Unknown"
        );
        setMissingVehicleTypeWarning(hasMissingVehicleType);

        const stockTypes = [
          "All",
          ...new Set(result.vehicles.map((v: any) => v.type).filter(Boolean)),
        ];
        const salesTypes = [
          "All",
          ...new Set(
            result.sales.map((s: any) => s.vehicleType).filter(Boolean)
          ),
        ];

        console.log("Processed stock types:", stockTypes);
        console.log("Processed sales types:", salesTypes);
        setStockVehicleTypes(stockTypes);
        setSalesVehicleTypes(salesTypes);
        setData(result);
      } catch (err: any) {
        console.error("Fetch error:", err.message, err.stack);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    session,
    status,
    startDate,
    endDate,
    selectedSalesType,
    selectedStockType,
    selectedPayment,
  ]);

  const processedData = data
    ? {
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
      }
    : null;

  const paymentTypes = ["All", "Cash", "Card", "Installment"];

  const formatDate = (date: string | Date | undefined) => {
    if (!date) {
      console.warn("Missing date in sales/vehicles data");
      return "N/A";
    }
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.warn(`Invalid date: ${date}`);
        return "Invalid Date";
      }
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      console.warn(`Date parsing error: ${date}`);
      return "Invalid Date";
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value == null || isNaN(value)) {
      console.warn(`Invalid or missing value: ${value}`);
      return "0";
    }
    return value.toLocaleString("en-US");
  };

  const calculateColumnWidths = (headers: string[], data: any[]) => {
    const widths = headers.map((header) => header.length);
    data.forEach((row) => {
      row.forEach((cell: any, index: number) => {
        const cellLength = String(cell || "N/A").length;
        if (cellLength > widths[index]) {
          widths[index] = cellLength;
        }
      });
    });
    return widths.map((w) => w + 2);
  };

  const addTextTable = (
    doc: jsPDF,
    title: string,
    headers: string[],
    data: any[],
    y: number,
    margin: number,
    maxY: number
  ) => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 5;
    doc.line(margin, y, 200 - margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (data.length > 0) {
      const columnWidths = calculateColumnWidths(headers, data);
      let x = margin;
      headers.forEach((header, index) => {
        doc.text(header.padEnd(columnWidths[index]), x, y);
        x += columnWidths[index] * 5;
      });
      y += 7;

      data.forEach((row) => {
        if (y + 10 > maxY) {
          doc.addPage();
          y = margin;
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(title, margin, y);
          y += 5;
          doc.line(margin, y, 200 - margin, y);
          y += 7;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          x = margin;
          headers.forEach((header, index) => {
            doc.text(header.padEnd(columnWidths[index]), x, y);
            x += columnWidths[index] * 5;
          });
          y += 7;
        }
        x = margin;
        row.forEach((cell: any, index: number) => {
          doc.text(String(cell || "N/A").padEnd(columnWidths[index]), x, y);
          x += columnWidths[index] * 5;
        });
        y += 7;
      });
    } else {
      doc.text("No data available.", margin, y);
      y += 7;
    }
    return y + 10;
  };

  const generatePDF = async () => {
    if (!processedData) {
      alert(
        "No data available to generate PDF. Please try again after data is loaded."
      );
      return;
    }
    setIsGeneratingPDF(true);
    try {
      console.log("Generating PDF with data:", processedData);
      const doc = new jsPDF();
      let y = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;
      const maxY = pageHeight - 30;

      const checkPageBreak = (requiredSpace: number) => {
        if (y + requiredSpace > maxY) {
          doc.addPage();
          y = margin;
        }
        return y;
      };

      const hasAutoTable = typeof (doc as any).autoTable === "function";

      const tableStyles = hasAutoTable
        ? {
            theme: "grid",
            headStyles: {
              fillColor: [66, 139, 202],
              textColor: 255,
              fontStyle: "bold",
            },
            bodyStyles: { textColor: 0 },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 2 },
          }
        : null;

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Dashboard Report", 105, y, { align: "center" });
      y += 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated for: ${
          session?.user.role === "admin"
            ? "Admin Dashboard"
            : session?.user.showroomName || "Showroom"
        }`,
        margin,
        y
      );
      y += 7;
      doc.text(
        `Generated on: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        margin,
        y
      );
      y += 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Applied Filters:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Date Range: ${startDate || "All time"} to ${endDate || "Present"}`,
        margin,
        y
      );
      y += 7;
      doc.text(`Sales Vehicle Type: ${selectedSalesType || "All"}`, margin, y);
      y += 7;
      doc.text(`Stock Vehicle Type: ${selectedStockType || "All"}`, margin, y);
      y += 7;
      doc.text(`Payment Type: ${selectedPayment || "All"}`, margin, y);
      y += 10;

      if (missingDataWarning.length > 0) {
        y = checkPageBreak(20 + missingDataWarning.length * 7);
        doc.setFontSize(12);
        doc.setTextColor(255, 0, 0);
        doc.text("Data Warnings:", margin, y);
        y += 7;
        missingDataWarning.forEach((warning) => {
          doc.text(warning, margin, y);
          y += 7;
        });
        doc.setTextColor(0, 0, 0);
        y += 10;
      }

      y = checkPageBreak(60);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Metrics:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const metrics = [
        `Total Sales: ${formatCurrency(processedData.totalSales)}`,
        `Total Revenue: PKR ${formatCurrency(processedData.totalRevenue)}`,
        `Current Stock: ${formatCurrency(processedData.currentStock)}`,
        `Total Stock Value: PKR ${formatCurrency(
          processedData.totalStockValue
        )}`,
        `Due Installments: PKR ${formatCurrency(processedData.totalDue)}`,
        `Installment Sales: ${formatCurrency(
          processedData.totalInstallmentSales
        )}`,
      ];
      metrics.forEach((metric) => {
        y = checkPageBreak(10);
        doc.text(metric, margin, y);
        y += 7;
      });
      y += 10;

      y = checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Sales Summary:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 5;
      const monthlySales = Object.values(processedData.monthlySales || {});
      if (monthlySales.length > 0) {
        if (hasAutoTable) {
          (doc as any).autoTable({
            startY: y,
            head: [["Month", "Units Sold", "Revenue (PKR)"]],
            body: monthlySales.map((month: any) => [
              month.month || "N/A",
              formatCurrency(month.count),
              formatCurrency(month.revenue),
            ]),
            ...tableStyles,
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        } else {
          y = addTextTable(
            doc,
            "Monthly Sales Summary:",
            ["Month", "Units Sold", "Revenue (PKR)"],
            monthlySales.map((month: any) => [
              month.month || "N/A",
              formatCurrency(month.count),
              formatCurrency(month.revenue),
            ]),
            y,
            margin,
            maxY
          );
        }
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No monthly sales data available.", margin, y);
        y += 10;
      }

      y = checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Sales by Vehicle Type:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 5;
      const salesByType = Object.values(processedData.salesByType || {});
      if (salesByType.length > 0) {
        if (hasAutoTable) {
          (doc as any).autoTable({
            startY: y,
            head: [["Vehicle Type", "Sales Count"]],
            body: salesByType.map((type: any) => [
              type.name || "N/A",
              formatCurrency(type.value),
            ]),
            ...tableStyles,
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        } else {
          y = addTextTable(
            doc,
            "Sales by Vehicle Type:",
            ["Vehicle Type", "Sales Count"],
            salesByType.map((type: any) => [
              type.name || "N/A",
              formatCurrency(type.value),
            ]),
            y,
            margin,
            maxY
          );
        }
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No sales by vehicle type data available.", margin, y);
        y += 10;
      }

      y = checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Type Distribution:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 5;
      const paymentDist = Object.values(
        processedData.paymentDistribution || {}
      );
      if (paymentDist.length > 0) {
        if (hasAutoTable) {
          (doc as any).autoTable({
            startY: y,
            head: [["Payment Type", "Count"]],
            body: paymentDist.map((payment: any) => [
              payment.name || "N/A",
              formatCurrency(payment.value),
            ]),
            ...tableStyles,
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        } else {
          y = addTextTable(
            doc,
            "Payment Type Distribution:",
            ["Payment Type", "Count"],
            paymentDist.map((payment: any) => [
              payment.name || "N/A",
              formatCurrency(payment.value),
            ]),
            y,
            margin,
            maxY
          );
        }
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No payment distribution data available.", margin, y);
        y += 10;
      }

      y = checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Stock by Vehicle Type:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 5;
      const stockByType = Object.values(processedData.stockByType || {});
      if (stockByType.length > 0) {
        if (hasAutoTable) {
          (doc as any).autoTable({
            startY: y,
            head: [["Vehicle Type", "Stock Count"]],
            body: stockByType.map((type: any) => [
              type.name || "N/A",
              formatCurrency(type.value),
            ]),
            ...tableStyles,
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        } else {
          y = addTextTable(
            doc,
            "Stock by Vehicle Type:",
            ["Vehicle Type", "Stock Count"],
            stockByType.map((type: any) => [
              type.name || "N/A",
              formatCurrency(type.value),
            ]),
            y,
            margin,
            maxY
          );
        }
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No stock by vehicle type data available.", margin, y);
        y += 10;
      }

      y = checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Stock by Showroom:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 5;
      const stockByPartner = Object.values(processedData.stockByPartner || {});
      if (stockByPartner.length > 0) {
        if (hasAutoTable) {
          (doc as any).autoTable({
            startY: y,
            head: [["Showroom", "Vehicles", "Value (PKR)"]],
            body: stockByPartner.map((partner: any) => [
              partner.name || "N/A",
              formatCurrency(partner.count),
              formatCurrency(partner.value),
            ]),
            ...tableStyles,
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        } else {
          y = addTextTable(
            doc,
            "Stock by Showroom:",
            ["Showroom", "Vehicles", "Value (PKR)"],
            stockByPartner.map((partner: any) => [
              partner.name || "N/A",
              formatCurrency(partner.count),
              formatCurrency(partner.value),
            ]),
            y,
            margin,
            maxY
          );
        }
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No stock by showroom data available.", margin, y);
        y += 10;
      }

      y = checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Sales Records:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 5;
      const sales = processedData.sales || [];
      if (sales.length > 0) {
        if (hasAutoTable) {
          (doc as any).autoTable({
            startY: y,
            head: [["Date", "Vehicle Type", "Amount (PKR)", "Payment Type"]],
            body: sales.map((sale: any) => [
              formatDate(sale.date),
              sale.vehicleType || "N/A",
              formatCurrency(sale.amount),
              sale.paymentType || "N/A",
            ]),
            ...tableStyles,
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 50 },
              2: { cellWidth: 30 },
              3: { cellWidth: 40 },
            },
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        } else {
          y = addTextTable(
            doc,
            "Detailed Sales Records:",
            ["Date", "Vehicle Type", "Amount (PKR)", "Payment Type"],
            sales.map((sale: any) => [
              formatDate(sale.date),
              sale.vehicleType || "N/A",
              formatCurrency(sale.amount),
              sale.paymentType || "N/A",
            ]),
            y,
            margin,
            maxY
          );
        }
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No sales records available.", margin, y);
        y += 10;
      }

      y = checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Stock Records:", margin, y);
      y += 5;
      doc.line(margin, y, 200 - margin, y);
      y += 5;
      const vehicles = processedData.vehicles || [];
      if (vehicles.length > 0) {
        if (hasAutoTable) {
          (doc as any).autoTable({
            startY: y,
            head: [["Vehicle Name", "Showroom Name", "Value (PKR)"]],
            body: vehicles.map((vehicle: any) => [
              vehicle.name || "N/A",
              vehicle.showroom || "N/A",
              formatCurrency(vehicle.value),
            ]),
            ...tableStyles,
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 50 },
              2: { cellWidth: 40 },
            },
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        } else {
          y = addTextTable(
            doc,
            "Detailed Stock Records:",
            ["Vehicle Name", "Showroom Name", "Value (PKR)"],
            vehicles.map((vehicle: any) => [
              vehicle.name || "N/A",
              vehicle.showroom || "N/A",
              formatCurrency(vehicle.value),
            ]),
            y,
            margin,
            maxY
          );
        }
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No stock records available.", margin, y);
        y += 10;
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount} | Report generated on ${new Date().toISOString()}`,
          105,
          pageHeight - 10,
          { align: "center" }
        );
      }

      doc.save(`dashboard-report-${startDate}-to-${endDate}.pdf`);
    } catch (error: any) {
      console.error("Error generating PDF:", error.message, error.stack);
      alert(`Failed to generate PDF: ${error.message}. Please try again.`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateExcel = async () => {
    if (!processedData) {
      alert(
        "No data available to generate Excel. Please try again after data is loaded."
      );
      return;
    }
    setIsGeneratingExcel(true);
    try {
      console.log("Generating Excel with data:", processedData);

      const escapeCsv = (value: any) => {
        if (value == null) return "";
        const str = value.toString();
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      let csvContent = "Dashboard Report\n\n";

      csvContent += `Generated for,${escapeCsv(
        session?.user.role === "admin"
          ? "Admin Dashboard"
          : session?.user.showroomName || "Showroom"
      )}\n`;
      csvContent += `Generated on,${escapeCsv(
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      )}\n\n`;

      csvContent += "Applied Filters:\n";
      csvContent += `Date Range,${escapeCsv(
        startDate || "All time"
      )} to ${escapeCsv(endDate || "Present")}\n`;
      csvContent += `Sales Vehicle Type,${escapeCsv(
        selectedSalesType || "All"
      )}\n`;
      csvContent += `Stock Vehicle Type,${escapeCsv(
        selectedStockType || "All"
      )}\n`;
      csvContent += `Payment Type,${escapeCsv(selectedPayment || "All")}\n\n`;

      csvContent += "Summary Metrics:\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Sales,${escapeCsv(
        formatCurrency(processedData.totalSales)
      )}\n`;
      csvContent += `Total Revenue,${escapeCsv(
        `PKR ${formatCurrency(processedData.totalRevenue)}`
      )}\n`;
      csvContent += `Current Stock,${escapeCsv(
        formatCurrency(processedData.currentStock)
      )}\n`;
      csvContent += `Total Stock Value,${escapeCsv(
        `PKR ${formatCurrency(processedData.totalStockValue)}`
      )}\n`;
      csvContent += `Due Installments,${escapeCsv(
        `PKR ${formatCurrency(processedData.totalDue)}`
      )}\n`;
      csvContent += `Installment Sales,${escapeCsv(
        formatCurrency(processedData.totalInstallmentSales)
      )}\n\n`;

      csvContent += "Monthly Sales:\n";
      csvContent += "Month,Units Sold,Revenue (PKR)\n";
      Object.values(processedData.monthlySales || {}).forEach((month: any) => {
        csvContent += `${escapeCsv(month.month || "N/A")},${escapeCsv(
          formatCurrency(month.count)
        )},${escapeCsv(formatCurrency(month.revenue))}\n`;
      });
      csvContent += "\n";

      csvContent += "Sales by Vehicle Type:\n";
      csvContent += "Vehicle Type,Sales Count\n";
      Object.values(processedData.salesByType || {}).forEach((type: any) => {
        csvContent += `${escapeCsv(type.name || "N/A")},${escapeCsv(
          formatCurrency(type.value)
        )}\n`;
      });
      csvContent += "\n";

      csvContent += "Payment Type Distribution:\n";
      csvContent += "Payment Type,Count\n";
      Object.values(processedData.paymentDistribution || {}).forEach(
        (payment: any) => {
          csvContent += `${escapeCsv(payment.name || "N/A")},${escapeCsv(
            formatCurrency(payment.value)
          )}\n`;
        }
      );
      csvContent += "\n";

      csvContent += "Stock by Vehicle Type:\n";
      csvContent += "Vehicle Type,Stock Count\n";
      Object.values(processedData.stockByType || {}).forEach((type: any) => {
        csvContent += `${escapeCsv(type.name || "N/A")},${escapeCsv(
          formatCurrency(type.value)
        )}\n`;
      });
      csvContent += "\n";

      csvContent += "Stock by Showroom:\n";
      csvContent += "Showroom,Vehicles,Value (PKR)\n";
      Object.values(processedData.stockByPartner || {}).forEach(
        (partner: any) => {
          csvContent += `${escapeCsv(partner.name || "N/A")},${escapeCsv(
            formatCurrency(partner.count)
          )},${escapeCsv(formatCurrency(partner.value))}\n`;
        }
      );
      csvContent += "\n";

      csvContent += "Detailed Sales Records:\n";
      csvContent += "Date,Vehicle Type,Amount (PKR),Payment Type\n";
      const sales = processedData.sales || [];
      sales.forEach((sale: any) => {
        csvContent += `${escapeCsv(formatDate(sale.date))},${escapeCsv(
          sale.vehicleType || "N/A"
        )},${escapeCsv(formatCurrency(sale.amount))},${escapeCsv(
          sale.paymentType || "N/A"
        )}\n`;
      });
      csvContent += "\n";

      csvContent += "Detailed Stock Records:\n";
      csvContent += "Vehicle Name,Showroom Name,Value (PKR)\n";
      const vehicles = processedData.vehicles || [];
      vehicles.forEach((vehicle: any) => {
        csvContent += `${escapeCsv(vehicle.name || "N/A")},${escapeCsv(
          vehicle.showroom || "N/A"
        )},${escapeCsv(formatCurrency(vehicle.value))}\n`;
      });

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
      console.error("Error generating Excel:", error.message, error.stack);
      alert(`Failed to generate Excel: ${error.message}. Please try again.`);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

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

  const hasValidStockData = processedData?.vehicles?.some(
    (vehicle: any) => vehicle.value > 0
  );

  return (
    <AuthCheck>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {session?.user.role === "admin"
              ? "Admin Dashboard"
              : `Dashboard - ${session?.user.showroomName || "Showroom"}`}
          </h1>
        </div>

        {missingVehicleTypeWarning && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
            Warning: Some sales records are missing vehicle types. This may
            affect reporting accuracy.
          </div>
        )}

        {missingDataWarning.length > 0 && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>Data Issues Detected:</p>
            <ul className="list-disc pl-5">
              {missingDataWarning.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <div className="flex gap-2">
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF || !processedData}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>📄 Export PDF</>
                )}
              </button>
              <button
                onClick={generateExcel}
                disabled={isGeneratingExcel || !processedData}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingExcel ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>📊 Export Excel</>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="border p-2 rounded w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                className="border p-2 rounded w-full"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Sales Vehicle Type
              </label>
              <select
                className="border p-2 rounded w-full"
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
              <label className="block text-sm font-medium mb-1">
                Stock Vehicle Type
              </label>
              <select
                className="border p-2 rounded w-full"
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
              <label className="block text-sm font-medium mb-1">
                Payment Type
              </label>
              <select
                className="border p-2 rounded w-full"
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
          <div className="flex gap-2 mt-4">
            <button
              onClick={clearDateFilter}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
            >
              Clear Date Filter
            </button>
            {(startDate || endDate) && (
              <div className="text-sm text-gray-600 flex items-center">
                📅 Showing data from {startDate || "beginning"} to{" "}
                {endDate || "now"}
              </div>
            )}
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
                <Bar dataKey="count" name="Units Sold" fill={COLORS[0]} />
                <Bar dataKey="revenue" name="Revenue (PKR)" fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sales by Vehicle Type">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.values(processedData?.salesByType || {})}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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

          <ChartCard title="Sales by Payment Type">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.values(processedData?.paymentDistribution || {})}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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

          <ChartCard title="Stock by Vehicle Type">
            {hasValidStockData ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.values(processedData?.stockByType || {})}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
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
              <p className="text-gray-500 text-center">
                No valid stock data available.
              </p>
            )}
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
