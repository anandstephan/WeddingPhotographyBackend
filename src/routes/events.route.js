import { Router } from "express";
import { createEvent, getEventById, updateEvent, deleteEvent, getEventsPhotographer, getEventsUser, uploadPhotos, addMorePhotos,deletePhotos } from "../controller/eventController.js";
import { multerUpload } from "../middlewere/multer.middlewere.js";
const eventRouter = Router();

eventRouter.post('/create', createEvent)
eventRouter.get('/get/:id', getEventById)
eventRouter.get('/get-list-user/:userId?', getEventsUser)
eventRouter.get('/get-list-photographer/:photographerId?', getEventsPhotographer)
eventRouter.put('/update/:id', updateEvent)
eventRouter.delete('/delete/:id', deleteEvent)
eventRouter.post('/upload-photos/:eventId', multerUpload.array('photos', 30), uploadPhotos)
eventRouter.post('/upload-more-photos/:eventId', multerUpload.array('photos', 30), addMorePhotos)
eventRouter.delete('/delete-photos/:eventId', deletePhotos)


export default eventRouter;
