import express from "express";
import userRoutes from "./user.route.js"
import publicRoutes from "./public.routes.js"
import adminRoutes from "./admin.routes.js";
import verifyJwtToken from "../middlewere/auth.middleware.js";

const integratedRoutes = express.Router();
integratedRoutes.use("/users", verifyJwtToken, userRoutes)
integratedRoutes.use("/public", publicRoutes)
integratedRoutes.use("/admin", verifyJwtToken, adminRoutes)

/*--------------------------------------------------photographer Profile Routes ---------------------------*/
import photographerProfilerouter from "./photographerProfile.route.js";
integratedRoutes.use("/photographerProfile", verifyJwtToken, photographerProfilerouter);

/*-----------------------------------------Storage packages------------------------------------*/
import storagePackageRouter from "./storagePackage.route.js";
integratedRoutes.use("/storagePackage", storagePackageRouter)

/*-----------------------------------------Events ------------------------------------*/
import eventRouter from "./events.route.js";
integratedRoutes.use("/storagePackage", eventRouter)

export default integratedRoutes;
