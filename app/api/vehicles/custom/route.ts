// app/api/vehicles/custom/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "../../../lib/db";
import { VehicleModels } from "../../../lib/models/VehicleModels";
import Transaction from "../../../lib/models/Transaction";
import { validateVehicleInput } from "../../../lib/validations/vehicle";
import User from "../../../lib/models/User";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  let body: any = null; // Define body for catch block
  try {
    await connectToDatabase();

    // Verify user session
    const session = await getServerSession(authOptions);
    console.log("Full session data in POST:", JSON.stringify(session, null, 2));

    if (!session || !session.user?.name) {
      console.error("Unauthorized: Missing session or username", {
        sessionUser: session?.user,
      });
      return NextResponse.json(
        { error: "Unauthorized", details: "Missing session or username" },
        { status: 401 }
      );
    }

    // Fetch user to get showroomName and _id
    const user = await User.findOne({ username: session.user.name }).select(
      "showroomName _id cnic"
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

    body = await req.json();
    console.log("Incoming vehicle data:", body);

    // Validate input
    const validation = await validateVehicleInput(body);
    if (!validation.valid) {
      console.error("Validation failed:", validation.errors);
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const {
      type,
      brand,
      model,
      price,
      engineNumber,
      chassisNumber,
      color,
      partner,
      partnerCNIC,
      showroomId,
    } = body;

    const VehicleModel = VehicleModels[type];
    if (!VehicleModel) {
      console.error("Invalid vehicle type:", type);
      return NextResponse.json(
        { error: "Invalid vehicle type", details: `Type: ${type}` },
        { status: 400 }
      );
    }

    // Verify showroomId matches user._id or session.showroomId
    let finalShowroomId = showroomId;
    if (!mongoose.Types.ObjectId.isValid(finalShowroomId)) {
      console.warn("Invalid showroomId in body, using user._id as fallback", {
        bodyShowroomId: showroomId,
        userId: user._id.toString(),
      });
      finalShowroomId = user._id.toString();
    }

    // Check for existing vehicle
    const duplicate = await VehicleModel.findOne({
      $or: [{ engineNumber }, { chassisNumber }],
    });

    if (duplicate) {
      console.error("Duplicate vehicle found", { engineNumber, chassisNumber });
      return NextResponse.json(
        {
          error: "Vehicle with these details already exists",
          details: { engineNumber, chassisNumber },
        },
        { status: 409 }
      );
    }

    // Create new vehicle
    const newVehicle = new VehicleModel({
      type,
      brand,
      model,
      price,
      engineNumber,
      chassisNumber,
      color,
      partner,
      partnerCNIC,
      status: "Stock In",
      showroom: user.showroomName || "Unknown Showroom",
      showroomId: finalShowroomId,
    });
    await newVehicle.save();
    console.log("Vehicle saved:", {
      vehicleId: newVehicle._id,
      showroomId: finalShowroomId,
    });

    // Option 1: Create transaction (uncomment if needed)
    /*
    const transaction = await Transaction.create({
      type,
      brand,
      model,
      price,
      engineNumber,
      chassisNumber,
      customerName: "N/A",
      customerCNIC: null, // Use null to bypass CNIC validation
      status: "Stock In",
      showroom: user.showroomName || "Unknown Showroom",
      showroomId: finalShowroomId,
      date: new Date(),
      paymentType: "None",
      amount: 0,
      actionBy: session.user.id,
      partner,
      partnerCNIC,
    });
    console.log("Transaction created:", { transactionId: transaction._id });
    */

    return NextResponse.json(
      { message: "Vehicle added successfully", id: newVehicle._id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Vehicle creation error:", {
      message: error.message,
      stack: error.stack,
      details: error.errors || error,
    });

    // Attempt rollback if vehicle was saved
    if (body?.engineNumber && body?.chassisNumber && body?.type) {
      const VehicleModel = VehicleModels[body.type];
      if (VehicleModel) {
        await VehicleModel.deleteMany({
          $or: [
            { engineNumber: body.engineNumber },
            { chassisNumber: body.chassisNumber },
          ],
        });
        console.log("Rollback performed for:", {
          engineNumber: body.engineNumber,
          chassisNumber: body.chassisNumber,
        });
      }
    }

    return NextResponse.json(
      {
        error: error.name || "Internal server error",
        message: error.message,
        details: error.errors || undefined,
      },
      { status: error.statusCode || 500 }
    );
  }
}

// GET handler (unchanged from previous response)
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

    console.log("Session showroomId:", session.user.showroomId);

    const type = req.nextUrl.searchParams.get("type");
    const status = req.nextUrl.searchParams.get("status");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");

    const user = await User.findOne({ username: session.user.name }).select(
      "showroomName _id"
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
    if (status) baseQuery.status = status;
    if (session.user.role !== "admin") {
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
