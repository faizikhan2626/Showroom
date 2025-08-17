"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { toast, Toaster } from "react-hot-toast";
import { useSession } from "next-auth/react";

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
  showroom: string;
  showroomId: string;
}

type PaymentType = "Cash" | "Card" | "Installment";

export default function SalesPage() {
  const { data: session, status } = useSession();
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
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);

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
      if (status === "loading" || !session?.user?.showroomId) return;
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
          showroomId: session.user.showroomId,
        });
        console.log("Fetching vehicles with query:", query.toString());
        const response = await fetch(
          `/api/vehicles/custom?${query.toString()}`
        );
        if (!response.ok) {
          let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
          try {
            const text = await response.text();
            console.log("Response body:", text);
            if (text) {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorMessage;
            }
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
          }
          throw new Error(errorMessage);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Expected array of vehicles");
        }
        console.log("Fetched vehicles:", data);
        setVehicles(data.filter((v: Vehicle) => v.status === "Stock In"));
      } catch (err) {
        console.error("Error loading vehicles:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load vehicles"
        );
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicles();
  }, [session, status]);

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
      setVehicleImage(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file (JPEG, PNG, etc.)");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setVehicleImage(event.target.result as string);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read the image file");
      };
      reader.readAsDataURL(file);
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
    if (form.engineNumber.length > 20) {
      return "Engine number is too long (max 20 characters)";
    }
    if (form.chassisNumber.length > 20) {
      return "Chassis number is too long (max 20 characters)";
    }
    if (form.paymentType === "Installment") {
      if (form.advanceAmount <= 0 || form.advanceAmount > totalAmount) {
        return "Advance amount must be between 0 and the total amount";
      }
      if (form.months < 1 || form.months > 60) {
        return "Number of months must be between 1 and 60";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.showroomId) {
      toast.error("Showroom ID is missing. Please contact support.");
      return;
    }

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
      showroomId: session.user.showroomId,
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
      setVehicles(vehicles.filter((v) => v._id !== selectedVehicle._id));

      setLastSale({
        ...result.sale,
        vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model}`,
        perMonth: result.sale.monthlyInstallment,
        vehicleType: form.vehicleType,
        showroom: result.sale.showroom,
        vehicleImage,
      });

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
      setVehicleImage(null);

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

      try {
        const query = new URLSearchParams({
          showroomId: session.user.showroomId,
        });
        const res = await fetch(`/api/vehicles/custom?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setVehicles(data.filter((v: Vehicle) => v.status === "Stock In"));
          }
        }
      } catch (refreshError) {
        console.error("Failed to refresh vehicles:", refreshError);
        toast.error("Failed to refresh vehicle list");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = (sale: any) => {
    if (!sale) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const labelX = margin;
    const valueX = 65;
    const maxTextWidth = pageWidth - valueX - margin - 40; // Reserve space for image in Customer section

    let y = 20;

    const checkPage = (buffer = 20) => {
      if (y > pageHeight - buffer) {
        doc.addPage();
        y = margin;
      }
      return y;
    };

    const wrapText = (text: string, x: number, y: number, maxWidth: number) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        checkPage(10);
        doc.text(line, x, y);
        y += 8; // Consistent spacing for readability
      });
      return y;
    };

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Sale Receipt", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt #: ${sale._id || "N/A"}`, labelX, y);
    doc.text(
      `Date: ${new Date(sale.saleDate).toLocaleDateString("en-GB")}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );
    y += 12;

    // Showroom Information
    checkPage(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Showroom Information", labelX, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Showroom:", labelX, y);
    y = wrapText(sale.showroom || "N/A", valueX, y, maxTextWidth);
    y += 10;

    // Customer Information
    checkPage(90);
    const customerSectionStartY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Customer Information", labelX, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Add vehicle image in top-right of Customer section
    if (sale.vehicleImage) {
      try {
        const imageSize = 40; // Compact size
        const imageX = pageWidth - margin - imageSize;
        doc.addImage(
          sale.vehicleImage,
          "JPEG",
          imageX,
          customerSectionStartY + 10,
          imageSize,
          imageSize
        );
      } catch (error) {
        console.error("Failed to add image to PDF:", error);
        doc.setFontSize(8);
        doc.text(
          "Image unavailable",
          pageWidth - margin - 30,
          customerSectionStartY + 5
        );
      }
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const customerFields = [
      { label: "Customer Name:", value: sale.customerName || "N/A" },
      { label: "Father's Name:", value: "_______________________________" },
      { label: "CNIC:", value: sale.customerCNIC || "N/A" },
      { label: "Phone:", value: "_______________________________" },
      { label: "Address:", value: "_______________________________" },
    ];

    customerFields.forEach((field) => {
      checkPage(15);
      doc.text(field.label, labelX, y);
      y = wrapText(field.value, valueX, y, maxTextWidth);
      y += 10;
    });

    // Vehicle Information
    checkPage(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Vehicle Information", labelX, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const vehicleFields = [
      { label: "Type:", value: sale.vehicleType || "N/A" },
      { label: "Model:", value: sale.vehicleName || "N/A" },
      { label: "Color:", value: sale.color || "N/A" },
      { label: "Engine Number:", value: sale.engineNumber || "N/A" },
      { label: "Chassis Number:", value: sale.chassisNumber || "N/A" },
    ];

    vehicleFields.forEach((field) => {
      checkPage(15);
      doc.text(field.label, labelX, y);
      y = wrapText(field.value, valueX, y, maxTextWidth);
      y += 10;
    });

    // Payment Information
    checkPage(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Payment Information", labelX, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const paymentFields = [
      { label: "Payment Method:", value: sale.paymentType || "N/A" },
      {
        label: "Total Amount:",
        value: (sale.totalAmount?.toLocaleString() || "0") + " PKR",
      },
    ];

    if (sale.paymentType === "Installment") {
      paymentFields.push(
        {
          label: "Advance Paid:",
          value: (sale.paidAmount?.toLocaleString() || "0") + " PKR",
        },
        {
          label: "Due Amount:",
          value: (sale.dueAmount?.toLocaleString() || "0") + " PKR",
        },
        {
          label: `Monthly Installment (${sale.months || "0"} months):`,
          value: (sale.perMonth?.toLocaleString() || "0") + " PKR",
        }
      );
    }

    paymentFields.forEach((field) => {
      checkPage(15);
      doc.text(field.label, labelX, y);
      y = wrapText(field.value, valueX, y, maxTextWidth);
      y += 10;
    });

    // Guarantors (Two Columns)
    checkPage(100);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Guarantors", labelX, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10; // Increased spacing

    const columnWidth = (pageWidth - 2 * margin) / 2 - 10; // Calculate column width with gap
    const leftColumnX = margin;
    const rightColumnX = pageWidth / 2 + 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Guarantor 1", leftColumnX, y);
    doc.text("Guarantor 2", rightColumnX, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const guarantorFields = [
      { label: "Name:", value: "____________________________" },
      { label: "CNIC:", value: "____________________________" },
      { label: "Address:", value: "____________________________" },
      { label: "Phone Number:", value: "____________________________" },
    ];

    let guarantor1Y = y + 5;
    let guarantor2Y = y + 5;

    guarantorFields.forEach((field) => {
      checkPage(15);
      // Left column (Guarantor 1)
      doc.text(field.label, leftColumnX, guarantor1Y);
      guarantor1Y = wrapText(
        field.value,
        leftColumnX + 25,
        guarantor1Y,
        columnWidth - 25
      );
      guarantor1Y += 10;

      // Right column (Guarantor 2)
      doc.text(field.label, rightColumnX, guarantor2Y);
      guarantor2Y = wrapText(
        field.value,
        rightColumnX + 25,
        guarantor2Y,
        columnWidth - 25
      );
      guarantor2Y += 10;
    });

    // Use the maximum Y position from both columns
    y = Math.max(guarantor1Y, guarantor2Y) + 15;

    // Signatures (Two Columns)
    checkPage(60); // Check if we have enough space for signatures
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Signatures", labelX, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const signatureFields = [
      {
        label: "Guarantor 1 Signature:",
        value: "_______________________",
      },
      {
        label: "Guarantor 2 Signature:",
        value: "_______________________",
      },
      {
        label: "Customer Signature:",
        value: "_______________________",
      },
      {
        label: "Manager/Owner Signature:",
        value: "_______________________",
      },
    ];

    // Split signature fields into two columns
    const leftSignatures = [signatureFields[0], signatureFields[2]];
    const rightSignatures = [signatureFields[1], signatureFields[3]];

    let signatureY = y;

    // Left signatures
    leftSignatures.forEach((field) => {
      checkPage(20);
      doc.text(field.label, leftColumnX, signatureY + 5);
      doc.text(field.value, leftColumnX + 45, signatureY + 5);
      signatureY += 25; // More space for signatures
    });

    signatureY = y; // Reset for right column

    // Right signatures
    rightSignatures.forEach((field) => {
      checkPage(20);
      doc.text(field.label, rightColumnX, signatureY + 5);
      doc.text(field.value, rightColumnX + 45, signatureY + 5);
      signatureY += 25;
    });

    y = signatureY + 20;

    // Footer
    checkPage(20);
    doc.setFontSize(8);
    doc.text("This is a computer-generated receipt.", pageWidth / 2, y, {
      align: "center",
    });
    // Save
    doc.save(
      `Receipt_${sale.customerName?.replace(/\s+/g, "_") || "sale"}_${
        sale._id || Date.now()
      }.pdf`
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Toaster position="top-center" />

      <h2 className="text-xl font-bold mb-4">Vehicle Sale Form</h2>

      {isLoading && !vehicles.length && (
        <div className="text-gray-600 mb-4">Loading vehicles...</div>
      )}

      {!isLoading && vehicles.length === 0 && (
        <div className="text-gray-600 mb-4">
          No vehicles available in stock for your showroom.
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

        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Buyer Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border px-3 py-2 rounded"
            disabled={isLoading}
          />
          {vehicleImage && (
            <img
              src={vehicleImage}
              alt="Vehicle Preview"
              className="mt-2 w-32 h-32 object-cover"
            />
          )}
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
                max="60"
                className="w-full border px-3 py-2 rounded"
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div className="md:col-span-2 bg-gray-100 p-4 rounded">
          <h3 className="font-medium mb-1">Payment Summary</h3>
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
          <p>Showroom: {lastSale.showroom}</p>
          <p>Vehicle Type: {lastSale.vehicleType}</p>
          <p>Vehicle: {lastSale.vehicleName}</p>
          <p>Customer: {lastSale.customerName}</p>
          <p>Payment: {lastSale.paymentType}</p>
          <p>Total: PKR {lastSale.totalAmount?.toLocaleString() || "N/A"}</p>
          {lastSale.paymentType === "Installment" && (
            <>
              <p>
                Advance: PKR {lastSale.paidAmount?.toLocaleString() || "N/A"}
              </p>
              <p>Due: PKR {lastSale.dueAmount?.toLocaleString() || "N/A"}</p>
              <p>
                Monthly: PKR {lastSale.perMonth?.toLocaleString() || "N/A"} ×{" "}
                {lastSale.months || "0"} months
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
