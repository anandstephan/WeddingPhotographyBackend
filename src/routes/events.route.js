import { Router } from "express";
import { createEvent, getEventById, updateEvent, deleteEvent, getEvents } from "../controller/eventController.js";

const eventRouter = Router();

eventRouter.post('/create', createEvent)
eventRouter.get('/get/:id', getEventById)
eventRouter.get('/get-list', getEvents)
eventRouter.post('/update/:id', updateEvent)
eventRouter.post('/delete/:id', deleteEvent)

export default eventRouter;
