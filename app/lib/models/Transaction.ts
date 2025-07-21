// lib/models/Transaction.ts
import mongoose, { Schema } from "mongoose";

const TransactionSchema = new Schema({
  type: { type: String, required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  price: { type: Number, required: true },
  engineNumber: { type: String, required: true },
  chassisNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  customerCNIC: {
    type: String,
    required: false, // Allow null/undefined
    validate: {
      validator: function (v: string | null) {
        return v === null || /^\d{5}-\d{7}-\d{1}$/.test(v);
      },
      message: "Invalid CNIC format",
    },
  },
  status: { type: String, required: true },
  showroom: { type: String, required: true },
  showroomId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: Date, required: true },
  paymentType: { type: String, required: true },
  amount: { type: Number, required: true },
  actionBy: { type: String, required: true },
  partner: { type: String, required: true },
  partnerCNIC: {
    type: String,
    required: true,
    match: [/^\d{5}-\d{7}-\d{1}$/, "Invalid partner CNIC format"],
  },
});

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
