import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

import adminRouter from "./routes/admin.route.js";

app.use("/api/v1/admin", adminRouter);

export { app };
