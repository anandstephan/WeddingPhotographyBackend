import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "http://localhost:6000"); // Replace with your frontend's origin
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

app.use(cors());
app.use(express.json());

import adminRouter from "./routes/admin.route.js";

app.use("/api/v1/admin", adminRouter);

export { app };
