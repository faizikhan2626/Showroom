// app/api/test-session/route.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  return NextResponse.json({ session });
}
