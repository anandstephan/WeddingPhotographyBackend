import { Router } from "express";
import { createOrder, verifyOrder } from "../controller/order.controller.js";
import { purchachedPackageCreate } from "../controller/purchasedPackage.controller.js";

const paymentRoute = Router();

paymentRoute.post("/create-order", createOrder);
paymentRoute.post("/verify", verifyOrder, purchachedPackageCreate);

export default paymentRoute;
