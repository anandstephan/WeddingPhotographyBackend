const mongoose = require("mongoose");

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
module.exports = User;
