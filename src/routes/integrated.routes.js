import express from "express";
import userRoutes from "./admin.route.js"
import publicRoutes from "./public.routes.js"

const integratedRoutes = express.Router();
integratedRoutes.use("/users", userRoutes)
integratedRoutes.use("/public", publicRoutes)

/*--------------------------------------------------photographer Profile Routes ---------------------------*/
import photographerProfilerouter from "./photographerProfile.route.js";
integratedRoutes.use("/photographerProfile", photographerProfilerouter);

export default integratedRoutes;
