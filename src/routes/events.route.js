import { Router } from "express";
import { createEvent } from "../controller/eventController";

const router = Router();

router.route("/createEvent").post(createEvent);

export default router;
