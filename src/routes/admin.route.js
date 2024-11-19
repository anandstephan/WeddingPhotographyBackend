import { Router } from "express";
import { loginUser, registerUser } from "../controller/admin.controller.js";

const router = Router();

router.route("/createUser").post(registerUser);
router.route("/login").post(loginUser);

export default router;
