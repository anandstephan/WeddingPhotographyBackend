import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import cors from "cors";
dotenv.config({
  path: "./.env",
});

app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Include credentials if necessary (e.g., cookies)
  })
);
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
