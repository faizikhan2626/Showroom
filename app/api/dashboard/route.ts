// app/api/dashboard/route.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
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

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const role = searchParams.get("role");
  const showroomId = searchParams.get("showroomId");

  if (userId !== session.user.id) {
    console.error("Forbidden: userId mismatch", {
      userId,
      sessionUserId: session.user.id,
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
        !session.user.showroomId ||
        !mongoose.Types.ObjectId.isValid(session.user.showroomId)
      ) {
        console.error("Invalid or missing showroomId for non-admin user", {
          userId,
          role,
          showroomId,
          sessionShowroomId: session.user.showroomId,
        });
        return new Response(
          JSON.stringify({
            message: "Valid showroom ID required for non-admin user",
          }),
          { status: 400 }
        );
      }
      showroomFilter = {
        showroomId: new mongoose.Types.ObjectId(session.user.showroomId),
      };
    }

    console.log("Applying showroom filter:", showroomFilter);

    // Query each vehicle collection individually
    const vehicleModels = [
      { model: Bike, type: "Bike" },
      { model: Car, type: "Car" },
      { model: Rickshaw, type: "Rickshaw" },
      { model: Loader, type: "Loader" },
      { model: ElectricBike, type: "Electric Bike" },
    ];

    const vehiclePromises = vehicleModels.map(async ({ model, type }) => {
      const vehicles = await model
        .find(showroomFilter)
        .populate("showroomId", "showroomName")
        .lean();
      return vehicles.map((vehicle) => ({
        ...vehicle,
        type,
        showroom:
          vehicle.showroomId?.showroomName || vehicle.showroom || "Unknown",
        showroomId: vehicle.showroomId?._id?.toString() || vehicle.showroomId,
      }));
    });

    const [
      bikeVehicles,
      carVehicles,
      rickshawVehicles,
      loaderVehicles,
      electricBikeVehicles,
      sales,
    ] = await Promise.all([
      ...vehiclePromises,
      Sale.find(showroomFilter).populate("showroomId", "showroomName").lean(),
    ]);

    // Combine all vehicles into a single array
    const vehicles = [
      ...bikeVehicles,
      ...carVehicles,
      ...rickshawVehicles,
      ...loaderVehicles,
      ...electricBikeVehicles,
    ];

    // Transform sales to include showroomName
    const transformedSales = sales.map((s) => ({
      ...s,
      showroom: s.showroomId?.showroomName || s.showroom || "Unknown",
      showroomId: s.showroomId?._id?.toString() || s.showroomId,
    }));

    console.log(
      "Fetched vehicles:",
      vehicles.length,
      "sales:",
      transformedSales.length,
      "filter:",
      showroomFilter
    );

    const totalSales = transformedSales.length;
    const totalRevenue = transformedSales.reduce(
      (sum, sale) => sum + (sale.totalAmount || 0),
      0
    );
    const currentStock = vehicles.filter((v) => v.status === "Stock In").length;

    return new Response(
      JSON.stringify({
        totalSales,
        totalRevenue,
        currentStock,
        vehicles,
        sales: transformedSales,
      }),
      { status: 200 }
    );
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
