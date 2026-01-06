// app/api/vehicles/seller/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { connectToDatabase } from "../../../lib/db";
import { VehicleModels } from "../../../lib/models/VehicleModels";
import User from "../../../lib/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    console.log("Full session data in GET:", JSON.stringify(session, null, 2));

    if (!session) {
      console.error("Unauthorized GET request", { url: req.url });
      return NextResponse.json(
        { error: "Unauthorized", details: "No active session" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ username: session.user.name }).select(
      "showroomName _id role"
    );
    if (!user || !user._id) {
      console.error("User not found", {
        username: session.user.name,
      });
      return NextResponse.json(
        {
          error: "User not found",
          details: `Username: ${session.user.name}`,
        },
        { status: 400 }
      );
    }

    const type = req.nextUrl.searchParams.get("type");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");

    let showroomId = session.user.showroomId;
    if (!showroomId || !mongoose.Types.ObjectId.isValid(showroomId)) {
      console.warn(
        "Invalid or missing showroomId, using user._id as fallback",
        {
          sessionShowroomId: session.user.showroomId,
          userId: user._id.toString(),
        }
      );
      showroomId = user._id.toString();
    } else {
      console.log("Valid showroomId used:", showroomId);
    }

    const baseQuery: any = {};
    if (user.role !== "admin") {
      baseQuery.showroomId = showroomId;
    }

    if (!type) {
      const allVehicles = await Promise.all(
        Object.entries(VehicleModels).map(async ([modelType, Model]) => {
          const vehicles = await Model.find(baseQuery)
            .populate("showroomId", "showroomName")
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();
          return vehicles.map((v) => ({
            ...v,
            type: modelType,
            showroom:
              v.showroomId?.showroomName || v.showroom || "Unknown Showroom",
            showroomId: v.showroomId?._id?.toString() || v.showroomId,
            partner: v.partner || "Unknown",
            partnerCNIC: v.partnerCNIC || "N/A",
          }));
        })
      );
      return NextResponse.json(allVehicles.flat());
    }

    const VehicleModel = VehicleModels[type];
    if (!VehicleModel) {
      console.error("Invalid vehicle type in GET:", type);
      return NextResponse.json(
        { error: "Invalid vehicle type", details: `Type: ${type}` },
        { status: 400 }
      );
    }

    const vehicles = await VehicleModel.find(baseQuery)
      .populate("showroomId", "showroomName")
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      vehicles.map((v) => ({
        ...v,
        type,
        showroom:
          v.showroomId?.showroomName || v.showroom || "Unknown Showroom",
        showroomId: v.showroomId?._id?.toString() || v.showroomId,
        partner: v.partner || "Unknown",
        partnerCNIC: v.partnerCNIC || "N/A",
      }))
    );
  } catch (error: any) {
    console.error("Vehicle fetch error:", {
      message: error.message,
      stack: error.stack,
      details: error.errors || error,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch vehicles",
        details: error.message || "An unexpected error occurred",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
