import express from "express";
import userRoutes from "./admin.route.js"
import publicRoutes from "./public.routes.js"

const integratedRoutes = express.Router();
integratedRoutes.use("/users", userRoutes)
integratedRoutes.use("/public", publicRoutes)


export default integratedRoutes;
