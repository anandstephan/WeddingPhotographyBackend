import express from 'express';
import { createPhotoPackage,getPhotoPackageById,getAllPhotoPackages,updatePhotoPackage,deletePhotoPackage } from '../controller/photoPackage.controller.js';
const photoPackageRoutes = express.Router();
photoPackageRoutes.post("/create", createPhotoPackage)
photoPackageRoutes.get("/get-package/:id", getPhotoPackageById)
photoPackageRoutes.post("/get-list/:photographerId", getAllPhotoPackages)
photoPackageRoutes.post("/update/:id", updatePhotoPackage)
photoPackageRoutes.post("/delete/:id", deletePhotoPackage)

export default photoPackageRoutes;