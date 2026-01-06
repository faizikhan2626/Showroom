import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/authOptions";
import { connectToDatabase } from "../../lib/db";
import Bike from "../../lib/models/Bike";
import Car from "../../lib/models/Car";
import Rickshaw from "../../lib/models/Rickshaw";
import Loader from "../../lib/models/Loader";
import ElectricBike from "../../lib/models/ElectricBike";
import Sale from "../../lib/models/Sale";
import mongoose from "mongoose";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    console.error("Unauthorized access attempt:", req.url);
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const user = session.user as { username: string; role: "admin" | "showroom"; showroomId: string; showroomName: string };

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const role = searchParams.get("role");
  const showroomId = searchParams.get("showroomId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const salesType = searchParams.get("salesType");
  const stockType = searchParams.get("stockType");
  const paymentType = searchParams.get("paymentType");

  if (userId !== user.username) {
    console.error("Forbidden: userId mismatch", {
      userId,
      sessionUserId: user.username,
    });
    return new Response(JSON.stringify({ message: "Forbidden" }), {
      status: 403,
    });
  }

  await connectToDatabase();

  try {
    // Validate showroomId for non-admin users
    let showroomFilter = {};
    if (role !== "admin") {
      if (
        !user.showroomId ||
        !mongoose.Types.ObjectId.isValid(user.showroomId)
      ) {
        console.error("Invalid or missing showroomId for non-admin user", {
          userId,
          role,
          showroomId,
          sessionShowroomId: user.showroomId,
        });
        return new Response(
          JSON.stringify({
            message: "Valid showroom ID required for non-admin user",
          }),
          { status: 400 }
        );
      }
      showroomFilter = {
        showroomId: new mongoose.Types.ObjectId(user.showroomId),
      };
    }

    // Build date filters
    const saleDateFilter =
      startDate && endDate
        ? {
            saleDate: {
              $gte: new Date(startDate),
              $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            },
          }
        : {};
    const stockDateFilter =
      startDate && endDate
        ? {
            dateAdded: {
              $gte: new Date(startDate),
              $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            },
          }
        : {};

    // Build type and payment filters
    const vehicleTypeFilter =
      stockType && stockType !== "All" ? { type: stockType } : {};
    const saleTypeFilter =
      salesType && salesType !== "All" ? { vehicleType: salesType } : {};
    const paymentTypeFilter =
      paymentType && paymentType !== "All" ? { paymentType } : {};

    console.log("Applying filters:", {
      showroomFilter,
      saleDateFilter,
      stockDateFilter,
      vehicleTypeFilter,
      saleTypeFilter,
      paymentTypeFilter,
    });

    // Query each vehicle collection
    const vehicleModels = [
      { model: Bike, type: "Bike" },
      { model: Car, type: "Car" },
      { model: Rickshaw, type: "Rickshaw" },
      { model: Loader, type: "Loader" },
      { model: ElectricBike, type: "Electric Bike" },
    ];

    const vehiclePromises = vehicleModels.map(async ({ model, type }) => {
      const vehicles = await model
        .find({
          ...showroomFilter,
          ...vehicleTypeFilter,
          ...stockDateFilter,
          status: "Stock In", // Ensure only stock vehicles are fetched
        })
        .select(
          "type price purchasePrice sellingPrice partners showroomId status dateAdded"
        )
        .populate("showroomId", "showroomName")
        .lean();
      console.log(`Fetched ${type} vehicles:`, vehicles);
      return vehicles.map((vehicle) => ({
        ...vehicle,
        type: vehicle.type || type,
        partner: vehicle.partners?.[0] || "No Partner Assigned",
        showroom:
          vehicle.showroomId?.showroomName || vehicle.showroom || "Unknown",
        showroomId: vehicle.showroomId?._id?.toString() || vehicle.showroomId,
        value:
          Number(
            vehicle.price || vehicle.purchasePrice || vehicle.sellingPrice
          ) || 0,
        dateAdded: vehicle.dateAdded
          ? new Date(vehicle.dateAdded).toISOString()
          : null,
      }));
    });

    const sales = await Sale.find({
      ...showroomFilter,
      ...saleTypeFilter,
      ...paymentTypeFilter,
      ...saleDateFilter,
    })
      .select(
        "saleDate vehicleType totalAmount paymentType quantity showroomId vehicleId"
      )
      .populate("showroomId", "showroomName")
      .lean();
    console.log("Fetched sales:", sales);

    const [
      bikeVehicles,
      carVehicles,
      rickshawVehicles,
      loaderVehicles,
      electricBikeVehicles,
    ] = await Promise.all(vehiclePromises);

    // Combine all vehicles
    const vehicles = [
      ...bikeVehicles,
      ...carVehicles,
      ...rickshawVehicles,
      ...loaderVehicles,
      ...electricBikeVehicles,
    ];

    // Transform sales
    const transformedSales = sales.map((s) => ({
      ...s,
      date: s.saleDate ? new Date(s.saleDate).toISOString() : null,
      vehicleType: s.vehicleType || "Unknown",
      amount: Number(s.totalAmount) || 0,
      paymentType: s.paymentType || "Unknown",
      quantity: Number(s.quantity) || 1,
      showroom: s.showroomId?.showroomName || s.showroom || "Unknown",
      showroomId: s.showroomId?._id?.toString() || s.showroomId,
    }));

    // Process dashboard metrics
    const totalSales = transformedSales.length;
    const totalRevenue = transformedSales.reduce(
      (sum, sale) => sum + sale.amount,
      0
    );
    const currentStock = vehicles.length; // Only Stock In vehicles
    const totalStockValue = vehicles.reduce(
      (sum, vehicle) => sum + vehicle.value,
      0
    );
    const totalDue = transformedSales
      .filter((s) => s.paymentType === "Installment")
      .reduce((sum, sale) => sum + (sale.dueAmount || 0), 0);
    const totalInstallmentSales = transformedSales.filter(
      (s) => s.paymentType === "Installment"
    ).length;

    const monthlySales = transformedSales.reduce((acc, sale) => {
      const date = new Date(sale.date || sale.saleDate);
      if (isNaN(date.getTime())) return acc;
      const month = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      if (!acc[month]) acc[month] = { month, count: 0, revenue: 0 };
      acc[month].count += sale.quantity;
      acc[month].revenue += sale.amount;
      return acc;
    }, {});

    const salesByType = transformedSales.reduce((acc, sale) => {
      const type = sale.vehicleType || "Unknown";
      if (!acc[type]) acc[type] = { name: type, value: 0 };
      acc[type].value += sale.quantity;
      return acc;
    }, {});

    const paymentDistribution = transformedSales.reduce((acc, sale) => {
      const pt = sale.paymentType || "Unknown";
      if (!acc[pt]) acc[pt] = { name: pt, value: 0 };
      acc[pt].value += sale.quantity;
      return acc;
    }, {});

    const stockByType = vehicles.reduce((acc, vehicle) => {
      const type = vehicle.type || "Unknown";
      if (!acc[type]) acc[type] = { name: type, value: 0 };
      acc[type].value += 1;
      return acc;
    }, {});

    const stockByPartner = vehicles.reduce((acc, vehicle) => {
      const partner = vehicle.partner || "No Partner Assigned";
      if (!acc[partner]) acc[partner] = { name: partner, count: 0, value: 0 };
      acc[partner].count += 1;
      acc[partner].value += vehicle.value;
      return acc;
    }, {});

    const response = {
      totalSales,
      totalRevenue,
      currentStock,
      totalStockValue,
      totalDue,
      totalInstallmentSales,
      monthlySales,
      salesByType,
      paymentDistribution,
      stockByType,
      stockByPartner,
      vehicles,
      sales: transformedSales,
    };

    console.log("Dashboard API response:", response);
    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    console.error("Dashboard error:", error.message, error.stack);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        details: error.message,
      }),
      { status: 500 }
    );
  }
}
