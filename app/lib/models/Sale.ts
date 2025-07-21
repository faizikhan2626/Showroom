// lib/models/Sale.ts
import mongoose, { Schema, Document, model, models } from "mongoose";

export interface ISale extends Document {
  vehicleId: mongoose.Types.ObjectId;
  vehicleType: string;
  brand: string;
  model: string;
  color: string;
  price: number;
  totalAmount: number;
  paymentType: "Cash" | "Card" | "Installment";
  paidAmount: number;
  dueAmount: number;
  months?: number;
  monthlyInstallment?: number;
  customerName: string;
  customerCNIC: string;
  engineNumber: string;
  chassisNumber: string;
  saleDate: Date;
  showroom: string;
  showroomId: mongoose.Types.ObjectId;
}

const SaleSchema: Schema = new Schema<ISale>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    vehicleType: {
      type: String,
      required: true,
    },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ["Cash", "Card", "Installment"],
      required: true,
    },
    paidAmount: { type: Number, required: true },
    dueAmount: { type: Number, required: true },
    months: { type: Number },
    monthlyInstallment: { type: Number },
    customerName: { type: String, required: true },
    customerCNIC: {
      type: String,
      required: true,
      match: [/^\d{5}-\d{7}-\d{1}$/, "Invalid CNIC format"],
    },
    engineNumber: { type: String, required: true },
    chassisNumber: { type: String, required: true },
    saleDate: { type: Date, default: Date.now },
    showroom: { type: String, required: true },
    showroomId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default models.Sale || model<ISale>("Sale", SaleSchema);
