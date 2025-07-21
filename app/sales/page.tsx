"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { toast, Toaster } from "react-hot-toast";

interface Vehicle {
  _id: string;
  type: string;
  brand: string;
  model: string;
  price: number;
  color: string;
  engineNumber: string;
  chassisNumber: string;
  status: "Stock In" | "Stock Out";
  showroom: string; // Add showroom
}

type PaymentType = "Cash" | "Card" | "Installment";

export default function SalesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    vehicleType: "Bike",
    vehicleId: "",
    paymentType: "Cash" as PaymentType,
    advanceAmount: 0,
    months: 1,
    customerName: "",
    customerCNIC: "",
    engineNumber: "",
    chassisNumber: "",
    color: "",
  });
  const [lastSale, setLastSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedVehicle = vehicles.find((v) => v._id === form.vehicleId);
  const filteredVehicles = vehicles.filter((v) => v.type === form.vehicleType);

  const availableEngineNumbers = [
    ...new Set(
      filteredVehicles.filter((v) => v.engineNumber).map((v) => v.engineNumber)
    ),
  ];
  const availableChassisNumbers = [
    ...new Set(
      filteredVehicles
        .filter((v) => v.chassisNumber)
        .map((v) => v.chassisNumber)
    ),
  ];
  const availableColors = [
    ...new Set(filteredVehicles.filter((v) => v.color).map((v) => v.color)),
  ];

  const totalAmount = selectedVehicle ? selectedVehicle.price : 0;
  const dueAmount =
    form.paymentType === "Installment" ? totalAmount - form.advanceAmount : 0;
  const perMonth =
    form.paymentType === "Installment" && form.months > 0
      ? Math.ceil(dueAmount / form.months)
      : 0;

  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/vehicles");
        if (!response.ok) {
          throw new Error(`Failed to load vehicles: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Expected array of vehicles");
        }
        setVehicles(data.filter((v: Vehicle) => v.status === "Stock In"));
      } catch (err) {
        console.error("Error loading vehicles:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load vehicles"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicles();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "vehicleType") {
      setForm({
        ...form,
        vehicleType: value,
        vehicleId: "",
        engineNumber: "",
        chassisNumber: "",
        color: "",
      });
    } else if (name === "vehicleId") {
      const vehicle = vehicles.find((v) => v._id === value);
      setForm({
        ...form,
        vehicleId: value,
        engineNumber: vehicle?.engineNumber || "",
        chassisNumber: vehicle?.chassisNumber || "",
        color: vehicle?.color || "",
      });
    } else if (name === "engineNumber") {
      const vehicle = vehicles.find((v) => v.engineNumber === value);
      setForm({
        ...form,
        engineNumber: value,
        chassisNumber: vehicle?.chassisNumber || "",
        color: vehicle?.color || "",
        vehicleId: vehicle?._id || "",
      });
    } else if (name === "chassisNumber") {
      const vehicle = vehicles.find((v) => v.chassisNumber === value);
      setForm({
        ...form,
        chassisNumber: value,
        engineNumber: vehicle?.engineNumber || "",
        color: vehicle?.color || "",
        vehicleId: vehicle?._id || "",
      });
    } else if (name === "color") {
      const vehicle = vehicles.find((v) => v.color === value);
      setForm({
        ...form,
        color: value,
        engineNumber: vehicle?.engineNumber || "",
        chassisNumber: vehicle?.chassisNumber || "",
        vehicleId: vehicle?._id || "",
      });
    } else {
      setForm({
        ...form,
        [name]: name === "advanceAmount" || name === "months" ? +value : value,
      });
    }
  };

  const validateForm = () => {
    if (!selectedVehicle) {
      return "Please select a vehicle";
    }
    if (!form.customerName.trim()) {
      return "Customer name is required";
    }
    if (!/^\d{5}-\d{7}-\d{1}$/.test(form.customerCNIC)) {
      return "Invalid CNIC format (e.g., 12345-1234567-1)";
    }
    if (form.paymentType === "Installment") {
      if (form.advanceAmount <= 0 || form.advanceAmount > totalAmount) {
        return "Advance amount must be between 0 and the total amount";
      }
      if (form.months < 1) {
        return "Number of months must be at least 1";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!selectedVehicle) return;

    const saleData = {
      vehicleType: form.vehicleType,
      vehicleId: selectedVehicle._id,
      paymentType: form.paymentType,
      advanceAmount: form.advanceAmount,
      months: form.months,
      customerName: form.customerName,
      customerCNIC: form.customerCNIC,
      engineNumber: selectedVehicle.engineNumber,
      chassisNumber: selectedVehicle.chassisNumber,
      color: selectedVehicle.color,
    };

    const loadingToast = toast.loading("Processing sale...");
    setIsLoading(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.message || errorResult.error || "Sale failed"
        );
      }

      const result = await response.json();

      // Update local state by removing sold vehicle
      setVehicles(vehicles.filter((v) => v._id !== selectedVehicle._id));

      setLastSale({
        ...result.sale,
        vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model}`,
        perMonth: result.sale.monthlyInstallment,
        vehicleType: form.vehicleType,
        showroom: result.sale.showroom, // Add showroom
      });

      // Reset form
      setForm({
        vehicleType: "Bike",
        vehicleId: "",
        paymentType: "Cash",
        advanceAmount: 0,
        months: 1,
        customerName: "",
        customerCNIC: "",
        engineNumber: "",
        chassisNumber: "",
        color: "",
      });

      toast.dismiss(loadingToast);
      toast.success(
        `${selectedVehicle.brand} ${selectedVehicle.model} sold successfully!`
      );
    } catch (error) {
      console.error("Sale submission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.dismiss(loadingToast);
      toast.error(errorMessage);

      // Refresh vehicle list
      try {
        const res = await fetch("/api/vehicles");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setVehicles(data.filter((v: Vehicle) => v.status === "Stock In"));
          }
        }
      } catch (refreshError) {
        console.error("Failed to refresh vehicles:", refreshError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = (sale: any) => {
    if (!sale) return;

    const doc = new jsPDF();

    // --- Theme & Layout ---
    const primaryColor = "#2c3e50";
    const accentColor = "#ecf0f1";
    const textColor = "#000000";
    const secondaryColor = "#7f8c8d";

    const labelX = 20;
    const valueX = 80;
    const sectionGap = 8;
    let y = 20;

    const checkPage = (buffer = 20) => {
      if (y > doc.internal.pageSize.getHeight() - buffer) {
        doc.addPage();
        y = 20;
      }
    };

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(primaryColor);
    doc.text("Sale Receipt", 105, y, { align: "center" });
    y += 12;

    doc.setFontSize(11);
    doc.setTextColor(textColor);
    doc.text(`Receipt #: ${sale._id || "________"}`, labelX, y);
    doc.text(
      `Date: ${new Date(sale.saleDate).toLocaleDateString()}`,
      200 - labelX,
      y,
      { align: "right" }
    );
    y += 10;

    // --- Showroom Info ---
    checkPage();
    doc.setFillColor(accentColor);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("Showroom Information", labelX, y + 6);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text("Showroom:", labelX, y);
    doc.text(sale.showroom || "__________________", valueX, y);
    y += sectionGap;

    // --- Customer Info ---
    checkPage();
    doc.setFillColor(accentColor);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("Customer Information", labelX, y + 6);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text("Customer Name:", labelX, y);
    doc.text(sale.customerName || "__________________", valueX, y);
    y += 8;

    doc.text("Father's Name:", labelX, y);
    doc.text("__________________", valueX, y);
    y += 8;

    doc.text("CNIC:", labelX, y);
    doc.text(sale.customerCNIC || "__________________", valueX, y);
    y += 8;

    doc.text("Phone:", labelX, y);
    doc.text("__________________", valueX, y);
    y += 8;

    doc.text("Address:", labelX, y);
    doc.text("_______________________________________", valueX, y);
    y += sectionGap;

    // --- Vehicle Info ---
    checkPage();
    doc.setFillColor(accentColor);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("Vehicle Information", labelX, y + 6);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text("Type:", labelX, y);
    doc.text(sale.vehicleType || "________", valueX, y);
    y += 8;

    doc.text("Model:", labelX, y);
    doc.text(sale.vehicleName || "________", valueX, y);
    y += 8;

    doc.text("Color:", labelX, y);
    doc.text(sale.color || "________", valueX, y);
    y += 8;

    doc.text("Engine Number:", labelX, y);
    doc.text(sale.engineNumber || "________", valueX, y);
    y += 8;

    doc.text("Chassis Number:", labelX, y);
    doc.text(sale.chassisNumber || "________", valueX, y);
    y += sectionGap;

    // --- Payment Info ---
    checkPage();
    doc.setFillColor(accentColor);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("Payment Information", labelX, y + 6);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text("Payment Method:", labelX, y);
    doc.text(sale.paymentType || "________", valueX, y);
    y += 8;

    doc.text("Total Amount:", labelX, y);
    doc.text(
      (sale.totalAmount?.toLocaleString() || "________") + " PKR",
      valueX,
      y
    );
    y += 8;

    if (sale.paymentType === "Installment") {
      doc.text("Advance Paid:", labelX, y);
      doc.text(
        (sale.paidAmount?.toLocaleString() || "________") + " PKR",
        valueX,
        y
      );
      y += 8;

      doc.text("Due Amount:", labelX, y);
      doc.text(
        (sale.dueAmount?.toLocaleString() || "________") + " PKR",
        valueX,
        y
      );
      y += 8;

      doc.text(
        `Monthly Installment (${sale.months || "__"} months):`,
        labelX,
        y
      );
      doc.text(
        (sale.perMonth?.toLocaleString() || "________") + " PKR",
        valueX,
        y
      );
      y += 8;
    }

    y += 4;

    // --- Guarantor Info ---
    checkPage();
    doc.setFillColor(accentColor);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text("Guarantor", labelX, y + 6);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text("Name:", labelX, y);
    doc.text("__________________", valueX, y);
    y += 8;

    doc.text("CNIC:", labelX, y);
    doc.text("__________________", valueX, y);
    y += 8;

    doc.text("Address:", labelX, y);
    doc.text("_______________________________________", valueX, y);
    y += 8;

    doc.text("Phone Number:", labelX, y);
    doc.text("__________________", valueX, y);
    y += sectionGap + 4;

    // --- Signatures ---
    checkPage();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(textColor);

    doc.text("Customer Signature: ___________________________", 15, y);
    doc.text("Witness Signature: ___________________________", 110, y);
    y += 20;

    doc.text("Manager/Owner Signature: ___________________________", 15, y);
    y += 15;

    // --- Footer ---
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor);
    doc.text("This is a computer-generated receipt.", 15, y);

    // --- Save File ---
    doc.save(
      `Receipt_${sale.customerName?.replace(/\s+/g, "_") || "sale"}_${
        sale._id || Date.now()
      }.pdf`
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-18">
      <Toaster position="top-center" />

      <h2 className="text-xl font-bold mb-4">Vehicle Sale Form</h2>

      {isLoading && !vehicles.length && (
        <div className="text-gray-600 mb-4">Loading vehicles...</div>
      )}

      {!isLoading && vehicles.length === 0 && (
        <div className="text-gray-600 mb-4">
          No vehicles available in stock.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 shadow-md rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Vehicle Type</label>
          <select
            name="vehicleType"
            value={form.vehicleType}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            disabled={isLoading}
          >
            <option value="Bike">Bike</option>
            <option value="Car">Car</option>
            <option value="Electric Bike">Electric Bike</option>
            <option value="Loader">Loader</option>
            <option value="Rickshaw">Rickshaw</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Select Vehicle</label>
          <select
            name="vehicleId"
            value={form.vehicleId}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
            disabled={isLoading || filteredVehicles.length === 0}
          >
            <option value="">Choose a vehicle</option>
            {filteredVehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.brand} {v.model} - {v.color} (PKR {v.price.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {selectedVehicle && (
          <>
            <div>
              <label className="block mb-1 font-medium">Engine Number</label>
              <select
                name="engineNumber"
                value={form.engineNumber}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
                disabled={isLoading || availableEngineNumbers.length === 0}
              >
                <option value="">Select Engine Number</option>
                {availableEngineNumbers.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Chassis Number</label>
              <select
                name="chassisNumber"
                value={form.chassisNumber}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
                disabled={isLoading || availableChassisNumbers.length === 0}
              >
                <option value="">Select Chassis Number</option>
                {availableChassisNumbers.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Color</label>
              <select
                name="color"
                value={form.color}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
                disabled={isLoading || availableColors.length === 0}
              >
                <option value="">Select Color</option>
                {availableColors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block mb-1 font-medium">Customer Name</label>
          <input
            type="text"
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Customer CNIC</label>
          <input
            type="text"
            name="customerCNIC"
            value={form.customerCNIC}
            onChange={handleChange}
            required
            placeholder="12345-1234567-1"
            className="w-full border px-3 py-2 rounded"
            disabled={isLoading}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Payment Type</label>
          <select
            name="paymentType"
            value={form.paymentType}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            disabled={isLoading}
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Installment">Installment</option>
          </select>
        </div>

        {form.paymentType === "Installment" && (
          <>
            <div>
              <label className="block mb-1 font-medium">Advance Amount</label>
              <input
                type="number"
                name="advanceAmount"
                value={form.advanceAmount}
                onChange={handleChange}
                min="0"
                max={totalAmount}
                className="w-full border px-3 py-2 rounded"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Months</label>
              <input
                type="number"
                name="months"
                value={form.months}
                onChange={handleChange}
                min="1"
                className="w-full border px-3 py-2 rounded"
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div className="md:col-span-2 bg-gray-50 p-4 rounded">
          <h3 className="font-medium mb-2">Payment Summary</h3>
          <p>Total Amount: PKR {totalAmount.toLocaleString()}</p>
          {form.paymentType === "Installment" && (
            <>
              <p>Advance: PKR {form.advanceAmount.toLocaleString()}</p>
              <p>Due: PKR {dueAmount.toLocaleString()}</p>
              <p>
                Monthly: PKR {perMonth.toLocaleString()} × {form.months} months
              </p>
            </>
          )}
        </div>

        <div className="md:col-span-2 text-right mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            disabled={!selectedVehicle || isLoading}
          >
            {isLoading ? "Processing..." : "Complete Sale"}
          </button>
        </div>
      </form>

      {lastSale && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Last Sale Receipt</h3>
          <p>Showroom: {lastSale.showroom}</p> {/* Add showroom */}
          <p>Vehicle Type: {lastSale.vehicleType}</p>
          <p>Vehicle: {lastSale.vehicleName}</p>
          <p>Customer: {lastSale.customerName}</p>
          <p>Payment: {lastSale.paymentType}</p>
          <p>Total: PKR {lastSale.totalAmount.toLocaleString()}</p>
          {lastSale.paymentType === "Installment" && (
            <>
              <p>Advance: PKR {lastSale.paidAmount.toLocaleString()}</p>
              <p>Due: PKR {lastSale.dueAmount.toLocaleString()}</p>
              <p>
                Monthly: PKR {lastSale.perMonth.toLocaleString()} ×{" "}
                {lastSale.months} months
              </p>
            </>
          )}
          <button
            onClick={() => generatePDF(lastSale)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            disabled={isLoading}
          >
            Download Receipt
          </button>
        </div>
      )}
    </div>
  );
}
