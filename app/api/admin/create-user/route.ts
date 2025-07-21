// app/api/admin/create-user/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../validations../../lib/authOptions";
import { connectToDatabase } from "../../../lib/db";
import User from "../../../lib/models/User";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ message: "Access denied" }, { status: 403 });
  }

  const body = await req.json();
  const { username, password, showroomName, role } = body;

  if (!username || !password || !showroomName || !role) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  await connectToDatabase();

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return NextResponse.json(
      { message: "User already exists" },
      { status: 409 }
    );
  }
  if (!["admin", "showroom"].includes(role)) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }

  const newUser = new User({
    username,
    password,
    showroomName,
    role,
  });

  await newUser.save();

  return NextResponse.json({ message: "User created" }, { status: 201 });
}
