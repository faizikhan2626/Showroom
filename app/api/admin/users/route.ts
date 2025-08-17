// app/api/admin/users/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "../../../lib/models/User";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    const users = await User.find({}).select(
      "username role showroomName showroomId"
    );
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
