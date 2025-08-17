import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose"; // Import Types for ObjectId
import { connectToDatabase } from "../../../lib/db";
import User from "../../../lib/models/User";
import Bike from "../../../lib/models/Bike";
import Car from "../../../lib/models/Car";
import ElectricBike from "../../../lib/models/ElectricBike";
import Rickshaw from "../../../lib/models/Rickshaw";
import Loader from "../../../lib/models/Loader";
import { authOptions } from "../../../lib/authOptions";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  console.log(
    "Session:",
    session
      ? {
          user: session.user,
          role: session.user?.role,
        }
      : "No session"
  );

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const showroomId = searchParams.get("showroomId");

  if (!showroomId || !Types.ObjectId.isValid(showroomId)) {
    return NextResponse.json(
      { message: "Valid showroom ID is required" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    // Start a transaction
    const dbSession = await mongoose.startSession();
    await dbSession.withTransaction(async () => {
      // Convert showroomId to ObjectId
      const objectId = new Types.ObjectId(showroomId);
      // Find the user by _id
      const user = await User.findOne({ _id: objectId }).session(dbSession);

      if (!user) {
        throw new Error("User not found");
      }
      if (user.role === "admin") {
        throw new Error("Cannot delete admin users");
      }

      // Delete user
      await User.deleteOne({ _id: objectId }).session(dbSession);
      console.log("User deleted:", showroomId);

      // Delete associated vehicles
      await Promise.all([
        Bike.deleteMany({ showroomId }).session(dbSession),
        Car.deleteMany({ showroomId }).session(dbSession),
        ElectricBike.deleteMany({ showroomId }).session(dbSession),
        Rickshaw.deleteMany({ showroomId }).session(dbSession),
        Loader.deleteMany({ showroomId }).session(dbSession),
      ]);
      console.log("Associated vehicles deleted");
    });

    dbSession.endSession();
    return NextResponse.json({
      message: "User and vehicles deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
