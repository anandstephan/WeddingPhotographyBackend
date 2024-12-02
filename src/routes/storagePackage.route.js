import express from 'express';
import { createStoragePackage, getStoragePackageById, deleteStoragePackage, updateStoragePackage, getStoragePackages, inputValidations } from '../controller/storagePackage.controller.js';

const storagePackageRouter = express.Router();

storagePackageRouter.post('/create', inputValidations, createStoragePackage)
storagePackageRouter.get('/get/:id', getStoragePackageById)
storagePackageRouter.delete('/delete/:id', deleteStoragePackage)
storagePackageRouter.put('/update/:id', updateStoragePackage)
storagePackageRouter.get('/get-all', getStoragePackages)
export default storagePackageRouter;
