import { Router } from "express";
import { registerUser } from "../controller/admin.controller.js";

const router = Router();

router.route("/createUser").post(registerUser);

export default router;
