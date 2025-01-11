import express from "express";
import {
  getUserPurchasedPackages,
  getPurchasedPackageById,
  getPurchasedPackageList
} from "../controller/purchasedPackage.controller.js";

const purchasedPackageRoutes = express.Router();
purchasedPackageRoutes.get("/active-plan", getUserPurchasedPackages);
purchasedPackageRoutes.get("/get/:id", getPurchasedPackageById);
purchasedPackageRoutes.get("/get-list", getPurchasedPackageList);

export default purchasedPackageRoutes;
