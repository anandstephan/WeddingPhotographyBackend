import express from "express";
import userRoutes from "./user.route.js"
import publicRoutes from "./public.routes.js"
import adminRoutes from "./admin.routes.js";
import verifyJwtToken from "../middlewere/auth.middleware.js";

const integratedRoutes = express.Router();
integratedRoutes.use("/users", verifyJwtToken, userRoutes)
integratedRoutes.use("/public", publicRoutes)
integratedRoutes.use("/public/admin", adminRoutes)

/*--------------------------------------------------photographer Profile Routes ---------------------------*/
import photographerProfilerouter from "./photographerProfile.route.js";
integratedRoutes.use("/photographerProfile", verifyJwtToken, photographerProfilerouter);

/*-----------------------------------------Storage packages------------------------------------*/
import storagePackageRouter from "./storagePackage.route.js";
integratedRoutes.use("/storagePackage", storagePackageRouter)

/*-----------------------------------------Events ------------------------------------*/
import eventRouter from "./events.route.js";
integratedRoutes.use("/events", verifyJwtToken, eventRouter)

/*-----------------------------------------photo packages ------------------------------------*/

import photoPackageRoutes from "./photoPackage.routes.js";
integratedRoutes.use("/photoPackage", verifyJwtToken, photoPackageRoutes);

/*-----------------------------------------event Category------------------------------------*/
import eventCategoryRoutes from "./eventCategory.routes.js";
integratedRoutes.use("/eventCategory", verifyJwtToken, eventCategoryRoutes)

export default integratedRoutes;
