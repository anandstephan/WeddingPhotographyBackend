import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

//routes import
import adminRouter from "./routes/admin.route.js";

//routes declaration
app.use("/api/v1/admin", adminRouter);

// Start the server

export { app };
