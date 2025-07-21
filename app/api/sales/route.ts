// app/api/sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectToDatabase } from "../../lib/db";
import mongoose from "mongoose";
import Sale from "../../lib/models/Sale";
import { VehicleModels } from "../../lib/models/VehicleModels";
import Transaction from "../../lib/models/Transaction";
import User from "../../lib/models/User";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all sales with populated showroomId
    const sales = await Sale.find({})
      .populate("showroomId", "showroomName")
      .lean();

    // Transform sales to include showroomName and stringified showroomId
    const transformedSales = sales.map((s) => ({
      ...s,
      showroom: s.showroomId?.showroomName || s.showroom || "Unknown",
      showroomId: s.showroomId?._id?.toString() || s.showroomId,
    }));

    console.log(
      "Fetched sales:",
      transformedSales.map((s) => ({
        _id: s._id,
        vehicleType: s.vehicleType || "Missing",
        showroom: s.showroom || "Missing",
        showroomId: s.showroomId || "Missing",
      }))
    );

    return NextResponse.json(transformedSales);
  } catch (error: any) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("Incoming sale data:", body);
    console.log("Received vehicleType:", body.vehicleType);

    const requiredFields = [
      "vehicleType",
      "vehicleId",
      "paymentType",
      "customerName",
      "customerCNIC",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields,
          message: `Please provide: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Fetch user to get showroomName, _id, and cnic
    const user = await User.findOne({ username: session.user.name }).select(
      "showroomName _id cnic"
    );
    if (!user || !user.showroomName || !user._id) {
      return NextResponse.json(
        { error: "User or showroom information not found" },
        { status: 400 }
      );
    }

    const vehicleType = body.vehicleType.trim();
    const VehicleModel = VehicleModels[vehicleType];
    if (!VehicleModel) {
      console.error("VehicleModels keys:", Object.keys(VehicleModels));
      return NextResponse.json(
        {
          error: "Invalid vehicle type",
          message: `Vehicle type '${vehicleType}' not found. Available types: ${Object.keys(
            VehicleModels
          ).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const vehicle = await VehicleModel.findById(body.vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        {
          error: "Vehicle not found",
          message: `No ${vehicleType} found with ID: ${body.vehicleId}`,
        },
        { status: 404 }
      );
    }

    if (vehicle.status !== "Stock In") {
      return NextResponse.json(
        {
          error: "Vehicle not available",
          message: "This vehicle is no longer available for sale",
          currentStatus: vehicle.status,
        },
        { status: 400 }
      );
    }

    // Verify showroom matches user's showroomName for non-admin users
    if (
      session.user.role !== "admin" &&
      vehicle.showroom !== user.showroomName
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: `You can only sell vehicles from your showroom: ${user.showroomName}`,
        },
        { status: 403 }
      );
    }

    // Get partner and partnerCNIC from vehicle.partners (assuming first partner)
    const partner = vehicle.partners?.[0]?.name || user.showroomName || "None";
    const partnerCNIC =
      vehicle.partners?.[0]?.cnic || user.cnic || "00000-0000000-0";
    if (!partnerCNIC.match(/^\d{5}-\d{7}-\d{1}$/)) {
      return NextResponse.json(
        {
          error: "Invalid partner CNIC",
          message: "Partner CNIC must be in format 12345-1234567-1",
        },
        { status: 400 }
      );
    }

    const totalAmount = vehicle.price;
    const paidAmount =
      body.paymentType === "Installment"
        ? Number(body.advanceAmount || 0)
        : totalAmount;
    const dueAmount =
      body.paymentType === "Installment" ? totalAmount - paidAmount : 0;
    const monthlyInstallment =
      body.paymentType === "Installment" && body.months
        ? Math.ceil(dueAmount / Number(body.months))
        : 0;

    const sale = new Sale({
      vehicleId: vehicle._id,
      vehicleType: vehicleType,
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color,
      price: vehicle.price,
      totalAmount,
      paymentType: body.paymentType,
      paidAmount,
      dueAmount,
      months: body.paymentType === "Installment" ? body.months : undefined,
      monthlyInstallment,
      customerName: body.customerName,
      customerCNIC: body.customerCNIC,
      engineNumber: vehicle.engineNumber,
      chassisNumber: vehicle.chassisNumber,
      showroom: user.showroomName,
      showroomId: user._id,
    });

    await sale.save();
    console.log(
      "Saved sale with vehicleType:",
      sale.vehicleType,
      "showroom:",
      sale.showroom,
      "showroomId:",
      sale.showroomId
    );

    // Delete the vehicle from the DB
    await VehicleModel.findByIdAndDelete(vehicle._id);

    // Record transaction
    await Transaction.create({
      type: vehicleType,
      brand: vehicle.brand,
      model: vehicle.model,
      price: vehicle.price,
      engineNumber: vehicle.engineNumber,
      chassisNumber: vehicle.chassisNumber,
      customerName: body.customerName,
      customerCNIC: body.customerCNIC,
      status: "Stock Out",
      showroom: user.showroomName,
      showroomId: user._id,
      date: new Date(),
      paymentType: body.paymentType,
      amount: paidAmount,
      actionBy: session.user.id,
      partner,
      partnerCNIC,
    });

    // Populate showroomId for the response
    const populatedSale = await Sale.findById(sale._id)
      .populate("showroomId", "showroomName")
      .lean();

    return NextResponse.json(
      {
        success: true,
        sale: {
          ...populatedSale,
          showroom:
            populatedSale?.showroomId?.showroomName ||
            populatedSale?.showroom ||
            "Unknown",
          showroomId:
            populatedSale?.showroomId?._id?.toString() ||
            populatedSale?.showroomId,
          vehicleName: `${vehicle.brand} ${vehicle.model}`,
          perMonth: monthlyInstallment,
        },
        message: "Sale recorded and vehicle removed successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Sale creation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "An unexpected error occurred",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
