// lib/models/Vehicle.ts
import mongoose, { Schema, model, models } from "mongoose";

const VehicleSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Car", "Bike", "Rickshaw", "Loader", "Electric Bike"],
      required: true,
    },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["Stock In", "Stock Out"],
      default: "Stock In",
    },
    engineNumbers: { type: [String], required: true },
    chassisNumbers: { type: [String], required: true },
    partners: { type: [String], required: true },
    partnerCNICs: { type: [String], required: true },
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

const Vehicle = models.Vehicle || model("Vehicle", VehicleSchema);
export default Vehicle;
