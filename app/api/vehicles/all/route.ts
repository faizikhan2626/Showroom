// app/api/vehicles/all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import { VehicleModels } from "../../../lib/models/VehicleModels";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";

export async function GET(req: NextRequest) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const baseQuery: any = {};
    if (session.user.role !== "admin") {
      baseQuery.showroomId = session.user.showroomId; // Use User._id as showroomId
    }

    const allVehicles = await Promise.all(
      Object.entries(VehicleModels).map(async ([type, Model]) => {
        const vehicles = await Model.find(baseQuery)
          .populate("showroomId", "showroomName")
          .lean();
        return vehicles.map((vehicle) => ({
          ...vehicle,
          type,
          showroom: vehicle.showroomId?.showroomName || vehicle.showroom,
          showroomId: vehicle.showroomId?._id?.toString() || vehicle.showroomId,
        }));
      })
    );

    return NextResponse.json(allVehicles.flat());
  } catch (error: any) {
    console.error("Error in GET /api/vehicles/all:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles", details: error.message },
      { status: 500 }
    );
  }
}
