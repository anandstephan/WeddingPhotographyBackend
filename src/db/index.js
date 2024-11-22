import mongoose from "mongoose";

const DB_URI =
  process.env.DB_URI ||
  "mongodb+srv://wedding:wedding@wedding.5o4lt.mongodb.net/?retryWrites=true&w=majority&appName=wedding";
console.log("Conseddddd", DB_URI);
async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
  }
}

export default connectDB;
