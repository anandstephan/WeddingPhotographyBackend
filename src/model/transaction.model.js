import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["user", "photographer"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      // enum: ['success', 'failed', 'pending', 'initiated'],
      default: "initiated",
    },
    paymentMethod: {
      type: String,
      // enum: ['credit_card', 'debit_card', 'paypal', 'net_banking', 'upi', 'cod'],
    },
    transactionId: {
      type: String,
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
