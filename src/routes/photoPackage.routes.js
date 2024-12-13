import express from 'express';
import { createPhotoPackage,getPhotoPackageById,getAllPhotoPackages,updatePhotoPackage,deletePhotoPackage } from '../controller/photoPackage.controller.js';
const photoPackageRoutes = express.Router();
photoPackageRoutes.post("/create", createPhotoPackage)
photoPackageRoutes.get("/get-package/:id", getPhotoPackageById)
photoPackageRoutes.get("/get-list/:photographerId", getAllPhotoPackages)
photoPackageRoutes.put("/update/:id", updatePhotoPackage)
photoPackageRoutes.delete("/delete/:id", deletePhotoPackage)

export default photoPackageRoutes;