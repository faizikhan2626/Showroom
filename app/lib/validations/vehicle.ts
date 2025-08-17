import mongoose from "mongoose";
import { VehicleModels } from "../models/VehicleModels";
import User from "../models/User";

export const validateVehicleInput = async (data: any) => {
  const errors: string[] = [];

  if (!data.type || !VehicleModels[data.type]) {
    errors.push("Invalid vehicle type");
  }
  if (!data.brand || data.brand.length < 2) {
    errors.push("Brand must be at least 2 characters");
  }
  if (!data.engineNumber || !data.chassisNumber) {
    errors.push("Engine and chassis numbers are required");
  }
  if (!data.price || isNaN(data.price) || data.price <= 0) {
    errors.push("Valid price is required");
  }
  if (!data.showroomId || !mongoose.Types.ObjectId.isValid(data.showroomId)) {
    errors.push("Valid showroom ID is required");
  } else {
    const user = await User.findById(data.showroomId);
    if (!user || !["showroom", "admin"].includes(user.role)) {
      errors.push("Showroom ID must reference a valid showroom or admin user");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
