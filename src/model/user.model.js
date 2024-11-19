import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{10}$/, // Validates 10-digit phone numbers
  },
  OTP: {
    type: String,
    default: "1234", // Default OTP value
  },
  isVerified: {
    type: Boolean,
    default: false, // Default to false, meaning not verified
  },
  userType: {
    type: String,
    enum: ["admin", "photographer", "user"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export { User };
