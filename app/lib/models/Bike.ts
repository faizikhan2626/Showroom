// lib/models/Bike.ts
import { Schema, model, models } from "mongoose";
import { IVehicleBase } from "../types/vehicle";

const BikeSchema = new Schema<IVehicleBase>(
  {
    brand: { type: String, required: true },
    model: { type: String, required: true },
    price: { type: Number, required: true },
    color: { type: String, required: true },
    engineNumber: { type: String, required: true, unique: true },
    chassisNumber: { type: String, required: true, unique: true },
    partner: { type: String, required: true },
    partnerCNIC: { type: String, required: true },
    status: {
      type: String,
      enum: ["Stock In", "Stock Out"],
      default: "Stock In",
    },
    showroom: {
      type: String,
      required: true,
      index: true,
    },
    showroomId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateAdded: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Bike = models.Bike || model<IVehicleBase>("Bike", BikeSchema);
export default Bike;
