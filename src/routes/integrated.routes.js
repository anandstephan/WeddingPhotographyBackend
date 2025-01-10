import express from "express";
import userRoutes from "./user.route.js";
import publicRoutes from "./public.routes.js";
import adminRoutes from "./admin.routes.js";
import verifyJwtToken from "../middlewere/auth.middleware.js";

const integratedRoutes = express.Router();
integratedRoutes.use("/users", verifyJwtToken, userRoutes);
integratedRoutes.use("/public", publicRoutes);
integratedRoutes.use("/public/admin", adminRoutes);

/*--------------------------------------------------photographer Profile Routes ---------------------------*/
import photographerProfilerouter from "./photographerProfile.route.js";
integratedRoutes.use(
  "/photographerProfile",
  verifyJwtToken,
  photographerProfilerouter
);

/*-----------------------------------------Storage packages------------------------------------*/
import storagePackageRouter from "./storagePackage.route.js";
integratedRoutes.use("/storagePackage", storagePackageRouter);

/*-----------------------------------------Events ------------------------------------*/
import eventRouter from "./events.route.js";
integratedRoutes.use("/events", verifyJwtToken, eventRouter);

/*-----------------------------------------photo packages ------------------------------------*/

import photoPackageRoutes from "./photoPackage.routes.js";
integratedRoutes.use("/photoPackage", verifyJwtToken, photoPackageRoutes);

/*-----------------------------------------event Category------------------------------------*/
import eventCategoryRoutes from "./eventCategory.routes.js";
integratedRoutes.use("/eventCategory", verifyJwtToken, eventCategoryRoutes);

/*-----------------------------------------event Category------------------------------------*/
import reviewRouter from "./review.router.js";
integratedRoutes.use("/reviews", verifyJwtToken, reviewRouter);

/*-----------------------------------------payments------------------------------------*/
import paymentRoute from "./payment.routes.js";
integratedRoutes.use("/payments", verifyJwtToken, paymentRoute);

/*-----------------------------------------transaction------------------------------------*/
import transactionRouter from "./transaction.routes.js";
integratedRoutes.use("/transaction", verifyJwtToken, transactionRouter);

/*---------------------------------------purchased storage packages--------------------------------*/
import purchasedPackageRoutes from "./purchasedPackage.routes.js";
integratedRoutes.use(
  "/purchased-package",
  verifyJwtToken,
  purchasedPackageRoutes
);
export default integratedRoutes;
