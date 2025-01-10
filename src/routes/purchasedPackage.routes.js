import express from "express";
import { getUserPurchasedPackages } from "../controller/purchasedPackage.controller.js";

const purchasedPackageRoutes = express.Router();

purchasedPackageRoutes.get("/active-plan", getUserPurchasedPackages);

export default purchasedPackageRoutes;
