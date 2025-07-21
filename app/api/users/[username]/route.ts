import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import User from "../../../lib/models/User";

// Note: Use `NextRequest` and access params from the function's second argument
export async function GET(
  req: NextRequest,
  context: { params: { username: string } }
) {
  try {
    await connectToDatabase();

    const { username } = context.params;
    const user = await User.findOne({ username }).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      showroomName: user.showroomName || "",
      role: user.role,
    });
  } catch (error) {
    console.error("GET /api/users/[username] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
