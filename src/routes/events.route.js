import { Router } from "express";
import { createEvent, getEventById, updateEvent, deleteEvent, getEventsPhotographer, getEventsUser } from "../controller/eventController.js";

const eventRouter = Router();

eventRouter.post('/create', createEvent)
eventRouter.get('/get/:id', getEventById)
eventRouter.get('/get-list-user/:userId?', getEventsUser)
eventRouter.get('/get-list-photographer/:photographerId?', getEventsPhotographer)
eventRouter.put('/update/:id', updateEvent)
eventRouter.delete('/delete/:id', deleteEvent)

export default eventRouter;
