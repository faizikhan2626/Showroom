// app/components/StockPage.tsx
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
  dateAdded: string;
};

const vehicleTypes = [
  "All",
  "Car",
  "Bike",
  "Rickshaw",
  "Loader",
  "Electric Bike",
];

export default function StockPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [type, setType] = useState<"All" | Vehicle["type"]>("All");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
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

  const { data: session } = useSession();

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles/custom");
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Fetch error details:", errorData);
        throw new Error(errorData.error || "Failed to fetch vehicles");
      }
      const data = await res.json();
      setVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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

  const filteredVehicles = vehicles.filter((vehicle) => {
    const typeMatch = type === "All" || vehicle.type === type;
    const brandMatch = !filterBrand || vehicle.brand === filterBrand;
    const modelMatch = !filterModel || vehicle.model === filterModel;
    return typeMatch && brandMatch && modelMatch;
  });

  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const availableBrands = Array.from(
    new Set(
      vehicles
        .filter((v) => type === "All" || v.type === type)
        .map((v) => v.brand)
    )
  ).sort();

  const availableModels = Array.from(
    new Set(
      vehicles
        .filter((v) => {
          const typeMatch = type === "All" || v.type === type;
          const brandMatch = !filterBrand || v.brand === filterBrand;
          return typeMatch && brandMatch;
        })
        .map((v) => v.model)
    )
  ).sort();

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
    const rows = filteredVehicles.map((v) => [
      v.type,
      v.brand,
      v.model,
      v.price,
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
    saveAs(blob, `stock-${type === "All" ? "all" : type}.csv`);
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
      body: filteredVehicles.map((v) => [
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
    doc.save(`stock-${type === "All" ? "all" : type}.pdf`);
  };

  // app/components/StockPage.tsx (partial update for handleSubmit)
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
      (field) => !form[field as keyof typeof form]
    );
    if (missing) {
      alert("Please fill in all required fields.");
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
    } catch (error) {
      console.error("Error submitting vehicle:", error);
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

  // Rest of the component remains unchanged
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
            options: vehicleTypes.filter((t) => t !== "All"),
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

      {/* FILTERS */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="font-semibold text-blue-700 mr-2">Type:</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as Vehicle["type"]);
              setFilterBrand("");
              setFilterModel("");
              setCurrentPage(1);
            }}
            className="border rounded px-4 py-2"
          >
            {vehicleTypes.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-blue-700 mr-2">Brand:</label>
          <select
            value={filterBrand}
            onChange={(e) => {
              setFilterBrand(e.target.value);
              setFilterModel("");
              setCurrentPage(1);
            }}
            className="border rounded px-4 py-2"
          >
            <option value="">All Brands</option>
            {availableBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-blue-700 mr-2">Model:</label>
          <select
            value={filterModel}
            onChange={(e) => {
              setFilterModel(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded px-4 py-2"
          >
            <option value="">All Models</option>
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOTALS */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-blue-600">
          Showing {filteredVehicles.length}{" "}
          {type === "All" ? "vehicles" : type.toLowerCase() + "s"}
        </h2>
        {filterBrand && (
          <div className="mt-2 text-sm text-gray-700">
            <strong>Brand:</strong> {filterBrand}
          </div>
        )}
        {filterModel && (
          <div className="mt-1 text-sm text-gray-700">
            <strong>Model:</strong> {filterModel}
          </div>
        )}
      </div>

      {/* VEHICLE LIST */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">
            No {type === "All" ? "vehicles" : type.toLowerCase() + "s"} found
            matching your filters.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {paginatedVehicles.map((vehicle) => (
              <motion.div
                key={vehicle._id || vehicle.chassisNumber}
                className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-600 hover:shadow-xl cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => {
                  if (vehicle._id) {
                    setSelectedVehicle(vehicle);
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-3xl">{getIcon(vehicle.type)}</div>
                  <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-600 font-medium">
                    {vehicle.type}
                  </span>
                </div>

                <div className="mt-2">
                  <h3 className="text-xl font-bold text-gray-800">
                    {vehicle.brand} {vehicle.model}
                  </h3>
                  <div className="text-blue-700 font-semibold text-lg">
                    PKR {vehicle.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Color: {vehicle.color}
                  </div>
                </div>

                <div className="mt-auto pt-2 border-t text-sm text-gray-500">
                  Added: {formatDate(vehicle.dateAdded)}
                </div>
              </motion.div>
            ))}
          </div>

          {/* PAGINATION */}
          {filteredVehicles.length > itemsPerPage && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from(
                { length: Math.ceil(filteredVehicles.length / itemsPerPage) },
                (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded border ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white"
                        : "bg-white text-blue-600 border-blue-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}
      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setSelectedVehicle(null)}
          ></div>

          <motion.div
            className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedVehicle(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl">{getIcon(selectedVehicle.type)}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </h2>
                  <div className="text-blue-700 font-semibold text-xl">
                    PKR {selectedVehicle.price.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Vehicle Details
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Type:</span>{" "}
                      {selectedVehicle.type}
                    </p>
                    <p>
                      <span className="font-medium">Color:</span>{" "}
                      {selectedVehicle.color}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {selectedVehicle.status}
                    </p>
                    <p>
                      <span className="font-medium">Added:</span>{" "}
                      {formatDate(selectedVehicle.dateAdded)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Identification
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Engine No:</span>{" "}
                      {selectedVehicle.engineNumber}
                    </p>
                    <p>
                      <span className="font-medium">Chassis No:</span>{" "}
                      {selectedVehicle.chassisNumber}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Provider Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedVehicle.partner}
                    </p>
                    <p>
                      <span className="font-medium">CNIC:</span>{" "}
                      {selectedVehicle.partnerCNIC}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
