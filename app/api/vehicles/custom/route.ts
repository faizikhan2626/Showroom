import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";
import { connectToDatabase } from "../../../lib/db";
import Bike from "../../../lib/models/Bike";
import Car from "../../../lib/models/Car";
import Rickshaw from "../../../lib/models/Rickshaw";
import Loader from "../../../lib/models/Loader";
import ElectricBike from "../../../lib/models/ElectricBike";
import mongoose from "mongoose";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    console.error("Unauthorized access attempt:", req.url);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(req.url);
  const showroomId = searchParams.get("showroomId");

  if (!showroomId || !mongoose.Types.ObjectId.isValid(showroomId)) {
    console.error("Invalid or missing showroomId:", { showroomId });
    return new Response(JSON.stringify({ error: "Invalid showroom ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.user.role !== "admin" && session.user.showroomId !== showroomId) {
    console.error("Forbidden: showroomId mismatch", {
      sessionShowroomId: session.user.showroomId,
      requestedShowroomId: showroomId,
    });
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  await connectToDatabase();

  try {
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
          showroomId: new mongoose.Types.ObjectId(showroomId),
          status: "Stock In",
        })
        .select(
          "type brand model price color status engineNumber chassisNumber partners partnerCNIC showroomId dateAdded"
        )
        .populate("showroomId", "showroomName")
        .lean();
      return vehicles.map((vehicle: any) => ({
        _id: vehicle._id.toString(),
        type: vehicle.type || type,
        brand: vehicle.brand || "Unknown",
        model: vehicle.model || "Unknown",
        price: Number(vehicle.price) || 0,
        color: vehicle.color || "Unknown",
        status: vehicle.status || "Stock In",
        engineNumber: vehicle.engineNumber || "N/A",
        chassisNumber: vehicle.chassisNumber || "N/A",
        partner: vehicle.partners?.[0] || "No Partner Assigned",
        partnerCNIC: vehicle.partnerCNIC || "N/A",
        showroom: vehicle.showroomId?.showroomName || "Unknown",
        showroomId: vehicle.showroomId?._id?.toString() || showroomId,
        dateAdded: vehicle.dateAdded
          ? new Date(vehicle.dateAdded).toISOString()
          : new Date().toISOString(),
      }));
    });

    const [
      bikeVehicles,
      carVehicles,
      rickshawVehicles,
      loaderVehicles,
      electricBikeVehicles,
    ] = await Promise.all(vehiclePromises);

    const vehicles = [
      ...bikeVehicles,
      ...carVehicles,
      ...rickshawVehicles,
      ...loaderVehicles,
      ...electricBikeVehicles,
    ];

    console.log("Fetched vehicles:", vehicles);
    return new Response(JSON.stringify(vehicles), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Vehicles fetch error:", error.message, error.stack);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    console.error("Unauthorized POST attempt:", req.url);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  await connectToDatabase();

  try {
    const data = await req.json();
    const {
      type,
      brand,
      model,
      price,
      color,
      engineNumber,
      chassisNumber,
      partner,
      partnerCNIC,
      status,
      showroomId,
    } = data;

    if (!showroomId || !mongoose.Types.ObjectId.isValid(showroomId)) {
      console.error("Invalid or missing showroomId:", { showroomId });
      return new Response(JSON.stringify({ error: "Invalid showroom ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      session.user.role !== "admin" &&
      session.user.showroomId !== showroomId
    ) {
      console.error("Forbidden: showroomId mismatch", {
        sessionShowroomId: session.user.showroomId,
        requestedShowroomId: showroomId,
      });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch showroom name from User model (since showroomId references User)
    const User = mongoose.model("User");
    const user = await User.findById(showroomId).select("showroomName").lean() as any;
    if (!user || !user.showroomName) {
      console.error(
        "User/Showroom not found or missing showroomName:",
        showroomId
      );
      return new Response(
        JSON.stringify({ error: "Showroom not found or missing name" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const vehicleData = {
      type,
      brand,
      model,
      price: Number(price),
      color,
      engineNumber,
      chassisNumber,
      partner, // Use partner as a string, not an array
      partnerCNIC,
      status: status || "Stock In",
      showroom: user.showroomName, // Map showroom name from User
      showroomId: new mongoose.Types.ObjectId(showroomId),
      dateAdded: new Date(),
    };

    let vehicle;
    switch (type) {
      case "Bike":
        vehicle = new Bike(vehicleData);
        break;
      case "Car":
        vehicle = new Car(vehicleData);
        break;
      case "Rickshaw":
        vehicle = new Rickshaw(vehicleData);
        break;
      case "Loader":
        vehicle = new Loader(vehicleData);
        break;
      case "Electric Bike":
        vehicle = new ElectricBike(vehicleData);
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid vehicle type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    await vehicle.save();
    console.log("Vehicle added:", vehicle);
    return new Response(
      JSON.stringify({ message: "Vehicle added successfully", vehicle }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Vehicle POST error:", error.message, error.stack);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
