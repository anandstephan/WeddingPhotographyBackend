import { Router } from "express";
import {
  fetchUser,
  loginUser,
  registerUser,
} from "../controller/admin.controller.js";

const router = Router();

router.route("/createUser").post(registerUser);
router.route("/login").post(loginUser);
router.route("/fetchUser").post(fetchUser);

export default router;
