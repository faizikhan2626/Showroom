// app/components/VehiclesBySellerPage.tsx
"use client";

import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import {
  FaCar,
  FaMotorcycle,
  FaBolt,
  FaTruckLoading,
  FaCogs,
  FaTimes,
} from "react-icons/fa";
import { useSession } from "next-auth/react";

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
}

const vehicleTypes = ["Car", "Bike", "Electric Bike", "Rickshaw", "Loader"];

const getIcon = (type: string) => {
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
      return <FaCar className="text-blue-600" />;
  }
};

export default function VehiclesBySellerPage() {
  const { data: session } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cnics, setCnics] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState({
    cnic: "",
    engine: "",
    chassis: "",
    brand: "",
    type: "",
  });
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [filtered, setFiltered] = useState<Vehicle[]>([]);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch("/api/vehicles/seller");
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Fetch error:", errorData);
          setError(errorData.error || "Failed to fetch vehicles");
          return;
        }
        const data = await res.json();
        setVehicles(data);
        setCnics([
          ...new Set(
            data
              .map((v: Vehicle) => v.partnerCNIC)
              .filter((cnic: string) => cnic && cnic !== "N/A")
          ),
        ]);
        setError(null);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError("Failed to fetch vehicles. Please try again.");
      }
    };
    fetchVehicles();
  }, []);

  const applyFilter = () => {
    let filteredData = vehicles.filter((v) => {
      return (
        (!search.cnic || v.partnerCNIC?.includes(search.cnic)) &&
        (!search.engine || v.engineNumber?.includes(search.engine)) &&
        (!search.chassis || v.chassisNumber?.includes(search.chassis)) &&
        (!selected || v.partnerCNIC === selected) &&
        (!search.brand ||
          v.brand?.toLowerCase().includes(search.brand.toLowerCase())) &&
        (!search.type || v.type === search.type)
      );
    });

    if (sortBy === "price") {
      filteredData.sort((a, b) =>
        sortOrder === "asc" ? a.price - b.price : b.price - a.price
      );
    } else if (sortBy === "date") {
      filteredData.sort((a, b) => {
        const aDate = new Date(a.dateAdded || "").getTime();
        const bDate = new Date(b.dateAdded || "").getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
    }

    setFiltered(filteredData);
    setIsFilterApplied(true);
  };

  const exportToExcel = () => {
    const cleanData = filtered.map(
      ({
        type,
        brand,
        model,
        price,
        engineNumber,
        chassisNumber,
        partner,
        partnerCNIC,
      }) => ({
        Type: type,
        Brand: brand,
        Model: model,
        Price: price,
        "Engine Number": engineNumber,
        "Chassis Number": chassisNumber,
        "Seller/Provider": partner,
        "Provider CNIC": partnerCNIC,
      })
    );
    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, "seller-stock.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Seller Vehicle Stock", 14, 16);
    const tableColumn = [
      "Type",
      "Brand",
      "Model",
      "Price",
      "Engine #",
      "Chassis #",
      "Seller",
      "Seller CNIC",
    ];
    const tableRows = filtered.map((v) => [
      v.type,
      v.brand,
      v.model,
      `PKR ${v.price.toLocaleString()}`,
      v.engineNumber,
      v.chassisNumber,
      v.partner,
      v.partnerCNIC,
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("seller-stock.pdf");
  };

  const closeModal = () => {
    setSelectedVehicle(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-blue-700 mb-6"
      >
        Vehicles by Seller
      </motion.h2>

      {error && (
        <motion.div
          className="mb-4 p-4 bg-red-100 text-red-700 rounded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      <motion.div
        className="mb-6 flex flex-wrap gap-4 items-end bg-blue-50 p-4 rounded-lg shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <label className="block text-sm font-semibold text-blue-700">
            All Providers
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="border px-3 py-2 rounded w-48"
          >
            <option value="">All</option>
            {cnics.map((cnic, idx) => (
              <option key={idx} value={cnic}>
                {cnic}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Provider CNIC"
          value={search.cnic}
          onChange={(e) => setSearch({ ...search, cnic: e.target.value })}
          className="border px-3 py-2 rounded"
        />
        <input
          type="text"
          placeholder="Engine Number"
          value={search.engine}
          onChange={(e) => setSearch({ ...search, engine: e.target.value })}
          className="border px-3 py-2 rounded"
        />
        <input
          type="text"
          placeholder="Chassis Number"
          value={search.chassis}
          onChange={(e) => setSearch({ ...search, chassis: e.target.value })}
          className="border px-3 py-2 rounded"
        />
        <input
          type="text"
          placeholder="Brand"
          value={search.brand}
          onChange={(e) => setSearch({ ...search, brand: e.target.value })}
          className="border px-3 py-2 rounded"
        />

        <select
          value={search.type}
          onChange={(e) => setSearch({ ...search, type: e.target.value })}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Types</option>
          {vehicleTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="date">Sort by Date</option>
          <option value="price">Sort by Price</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>

        <button
          onClick={applyFilter}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Search
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export Excel
          </button>
          <button
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {isFilterApplied ? (
          filtered.length > 0 ? (
            filtered.map((v, i) => (
              <motion.div
                key={v._id || i}
                className="bg-white p-4 shadow rounded border-l-4 border-blue-500 cursor-pointer hover:shadow-md transition"
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedVehicle(v)}
              >
                <div className="flex justify-between items-center">
                  <div className="text-3xl">{getIcon(v.type)}</div>
                  <span className="text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-600 font-medium">
                    {v.type}
                  </span>
                </div>
                <h3 className="font-bold text-lg mt-2">
                  {v.brand} {v.model}
                </h3>
                <p className="text-sm text-gray-600">
                  Price: PKR {v.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  Engine: {v.engineNumber}
                  <br />
                  Chassis: {v.chassisNumber}
                </p>
                <p className="text-sm text-gray-800 mt-2 font-medium">
                  Seller/Provider: {v.partner} ({v.partnerCNIC})
                </p>
              </motion.div>
            ))
          ) : (
            <p className="text-gray-500">No vehicles match the filter.</p>
          )
        ) : (
          <p className="text-gray-500">
            Please apply a filter to see vehicles.
          </p>
        )}
      </motion.div>

      {selectedVehicle && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              <FaTimes size={20} />
            </button>
            <h3 className="text-2xl font-bold text-blue-700 mb-4">
              {selectedVehicle.brand} {selectedVehicle.model}
            </h3>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Type:</strong> {selectedVehicle.type}
              </p>
              <p>
                <strong>Price:</strong> PKR{" "}
                {selectedVehicle.price.toLocaleString()}
              </p>
              <p>
                <strong>Engine Number:</strong> {selectedVehicle.engineNumber}
              </p>
              <p>
                <strong>Chassis Number:</strong> {selectedVehicle.chassisNumber}
              </p>
              <p>
                <strong>Seller/Provider:</strong> {selectedVehicle.partner}
              </p>
              <p>
                <strong>Provider CNIC:</strong> {selectedVehicle.partnerCNIC}
              </p>
              <p>
                <strong>Color:</strong> {selectedVehicle.color || "N/A"}
              </p>
              <p>
                <strong>Date Added:</strong>{" "}
                {selectedVehicle.dateAdded
                  ? new Date(selectedVehicle.dateAdded).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <button
              onClick={closeModal}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
