import express from 'express';
import { createEventCategory ,editEventCategory,getEventCategoryById,getAllEventCategories,deleteEventCategory} from '../controller/eventCategory.controller.js';
import { multerUpload } from '../middlewere/multer.middlewere.js';
const eventCategoryRoutes = express.Router();

eventCategoryRoutes.post("/create", multerUpload.single("image"), createEventCategory)
eventCategoryRoutes.put("/update/:id", multerUpload.single("image"), editEventCategory)
eventCategoryRoutes.get("/get/:id", getEventCategoryById)
eventCategoryRoutes.get("/get-list", getAllEventCategories)
eventCategoryRoutes.delete("/delete/:id", deleteEventCategory)
export default eventCategoryRoutes;