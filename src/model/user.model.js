import mongoose from "mongoose";
import jwt from "jsonwebtoken";
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
    match: /^\d{10}$/,
  },
  OTP: {
    type: String,
    default: "1234",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  refreshToken: { type: String, select: false },
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

userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ userId: this._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ userId: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

const User = mongoose.model("User", userSchema);
export { User };
