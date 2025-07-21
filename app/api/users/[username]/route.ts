// app/api/users/[username]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db"; // your MongoDB connection
import User from "../../../lib/models/User";

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  await connectToDatabase();
  const user = await User.findOne({ username: params.username }).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    username: user.username,
    showroomName: user.showroomName || "",
    role: user.role,
  });
}
