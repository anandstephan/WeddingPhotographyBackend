import mongoose from "mongoose";

const photographerPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["Gold", "Silver", "Diamond"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  price: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
  },
});

const PhotographerPackage = mongoose.model(
  "photographerPackage",
  photographerPackageSchema
);
export { PhotographerPackage };
