"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FaTruckLoading,
  FaMotorcycle,
  FaCar,
  FaBolt,
  FaCogs,
  FaInfoCircle,
  FaDownload,
  FaFilePdf,
} from "react-icons/fa";
import saveAs from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSession } from "next-auth/react";

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

export default function StockPage() {
  const { data: session, status } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const itemsPerPage = 6;

  const [form, setForm] = useState({
    type: "Bike" as Vehicle["type"],
    brand: "",
    model: "",
    price: 0,
    color: "",
    partner: "",
    partnerCNIC: "",
    engineNumber: "",
    chassisNumber: "",
  });

  const fetchVehicles = async () => {
    if (status === "loading" || !session?.user) return;
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const query = new URLSearchParams({
        showroomId: session.user.showroomId || "",
      });
      console.log(
        "Fetching vehicles with query:",
        `/api/vehicles/custom?${query.toString()}`
      );
      const res = await fetch(`/api/vehicles/custom?${query.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      console.log(
        "Response status:",
        res.status,
        "Status text:",
        res.statusText
      );

      // Check for non-OK status codes
      if (!res.ok) {
        let errorMessage = `HTTP error ${res.status}: ${res.statusText}`;
        try {
          const text = await res.text();
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

      const data = await res.json();
      console.log("Fetched vehicles:", data);
      if (!Array.isArray(data) || data.length === 0) {
        setWarnings([
          "No stock records found. Verify showroom ID or add new stock.",
        ]);
        setVehicles([]);
      } else {
        setVehicles(data);
        setWarnings([]);
      }
    } catch (error: any) {
      console.error("Error fetching vehicles:", error.message, error.stack);
      setError(`Failed to load stock data: ${error.message}`);
      setWarnings([
        "Failed to load stock data. Please try again or contact support.",
      ]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [session, status]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const getIcon = (type: Vehicle["type"]) => {
    switch (type) {
      case "Car":
        return <FaCar className="text-blue-600" />;
      case "Bike":
        return <FaMotorcycle className="text-blue-600" />;
      case "Electric Bike":
        return <FaBolt className="text-blue-600" />;
      case "Loader":
        return <FaTruckLoading className="text-blue-600" />;
      case "Rickshaw":
        return <FaCogs className="text-blue-600" />;
      default:
        return <FaInfoCircle className="text-blue-600" />;
    }
  };

  const paginatedVehicles = vehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportCSV = () => {
    const header = [
      "Type",
      "Brand",
      "Model",
      "Price",
      "Color",
      "Engine Number",
      "Chassis Number",
      "Partner",
      "CNIC",
      "Showroom",
      "Date Added",
    ];
    const rows = vehicles.map((v) => [
      v.type,
      v.brand,
      v.model,
      v.price.toLocaleString(),
      v.color,
      v.engineNumber,
      v.chassisNumber,
      v.partner,
      v.partnerCNIC,
      v.showroom,
      formatDate(v.dateAdded),
    ]);
    const csvContent = [header, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `stock-all.csv`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Stock Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Type",
          "Brand",
          "Model",
          "Price",
          "Color",
          "Engine No.",
          "Chassis No.",
          "Partner",
          "CNIC",
          "Showroom",
          "Date Added",
        ],
      ],
      body: vehicles.map((v) => [
        v.type,
        v.brand,
        v.model,
        v.price.toLocaleString(),
        v.color,
        v.engineNumber,
        v.chassisNumber,
        v.partner,
        v.partnerCNIC,
        v.showroom,
        formatDate(v.dateAdded),
      ]),
    });
    doc.save(`stock-all.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.name) {
      alert("You must be logged in to add stock.");
      return;
    }

    if (!session?.user?.showroomId) {
      alert("Showroom ID is missing. Please contact support.");
      return;
    }

    const requiredFields = [
      "type",
      "brand",
      "model",
      "price",
      "color",
      "engineNumber",
      "chassisNumber",
      "partner",
      "partnerCNIC",
    ];

    const missing = requiredFields.some(
      (field) =>
        !form[field as keyof typeof form] ||
        form[field as keyof typeof form] === ""
    );
    if (missing) {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate price is a positive number
    if (form.price <= 0) {
      alert("Price must be a positive number.");
      return;
    }

    // Validate partnerCNIC format (e.g., 16202-1234567-1)
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(form.partnerCNIC)) {
      alert("Invalid CNIC format. Use XXXXX-XXXXXXX-X.");
      return;
    }

    try {
      const res = await fetch("/api/vehicles/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: "Stock In",
          showroomId: session.user.showroomId,
        }),
      });

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch (jsonError) {
          console.error("Failed to parse response:", jsonError);
          alert("Server error: Unable to process response. Please try again.");
          return;
        }
        alert(`Failed: ${errorData.error || "Unknown error"}`);
        console.error("Error details:", errorData.details);
        return;
      }

      const result = await res.json();
      alert("Vehicle added to stock!");
      setForm({
        type: "Bike",
        brand: "",
        model: "",
        price: 0,
        color: "",
        partner: "",
        partnerCNIC: "",
        engineNumber: "",
        chassisNumber: "",
      });
      fetchVehicles();
    } catch (error: any) {
      console.error("Error submitting vehicle:", error.message, error.stack);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "price" ? +value : value,
    });
  };

  if (status === "loading") return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-26">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700">Stock Vehicles</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FaDownload /> CSV
          </button>
          <button
            onClick={exportPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FaFilePdf /> PDF
          </button>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white shadow p-6 rounded-xl border mb-10"
      >
        {[
          {
            name: "type",
            type: "select",
            options: vehicleTypes,
          },
          { name: "brand", placeholder: "e.g. Honda" },
          { name: "model", placeholder: "e.g. CG-125" },
          { name: "price", type: "number", placeholder: "e.g. 150000" },
          { name: "color", placeholder: "e.g. Red" },
          {
            name: "partner",
            label: "Provider Name",
            placeholder: "e.g. Ahmed Autos",
          },
          {
            name: "partnerCNIC",
            label: "Provider CNIC",
            placeholder: "16202-1234567-1",
            pattern: "^\\d{5}-\\d{7}-\\d{1}$",
          },
          { name: "engineNumber", placeholder: "e.g. EN123456" },
          { name: "chassisNumber", placeholder: "e.g. CH123456" },
        ].map((field) => (
          <div key={field.name}>
            <label className="font-semibold text-blue-700">
              {field.label ||
                field.name.charAt(0).toUpperCase() + field.name.slice(1)}
            </label>
            {field.type === "select" ? (
              <select
                name={field.name}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                className="w-full mt-1 border p-2 rounded"
                required
              >
                {(field.options as string[]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={field.name}
                type={field.type || "text"}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={field.placeholder}
                className="w-full mt-1 border p-2 rounded"
                pattern={field.pattern}
                required
              />
            )}
          </div>
        ))}

        <div className="md:col-span-2 mt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
          >
            Add to Stock
          </button>
        </div>
      </form>
    </div>
  );
}
