import { Router } from "express";
import {
  createOrder,
  verifyOrder,
} from "../controller/order.controller.js";

const paymentRoute = Router();

paymentRoute.post("/create-order", createOrder);
// paymentRoute.post("/verify", verifyOrder, subscribeAPlan);

export default paymentRoute;
