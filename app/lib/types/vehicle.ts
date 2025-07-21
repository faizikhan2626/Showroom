// lib/types/vehicle.ts
import { Model } from "mongoose";
import mongoose from "mongoose";

export type VehicleType =
  | "Bike"
  | "Car"
  | "Rickshaw"
  | "Loader"
  | "Electric Bike";

export interface IVehicleBase {
  brand: string;
  model: string;
  price: number;
  color: string;
  status: "Stock In" | "Stock Out";
  showroom: string;
  showroomId: mongoose.Types.ObjectId;
  dateAdded: Date;
  partner: string;
  partnerCNIC: string;
  engineNumber: string;
  chassisNumber: string;
}

export interface IVehicleModel<T extends IVehicleBase> extends Model<T> {
  findVehiclesByShowroom(showroom: string): Promise<T[]>;
  countStock(
    showroom: string
  ): Promise<{ inStock: number; outOfStock: number }>;
}
