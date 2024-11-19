import mongoose from "mongoose";

const DB_URI = process.env.DB_URI || "mongodb://127.0.0.1:27017/test";
async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
  }
}

export default connectDB;
