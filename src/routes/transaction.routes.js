import express from "express";
import {
  updateTransaction,
  getAllTransactions,
  updateTransactionDetails,
  getTransactionById,
} from "../controller/transaction.controller.js";
const transactionRouter = express.Router();

transactionRouter.get("/get/:id", getTransactionById);
transactionRouter.get("/get-list", getAllTransactions);
transactionRouter.put("/update/:id", updateTransaction);
transactionRouter.put("/update-details/:transactionId", updateTransactionDetails);
// router.delete("/delete/:id", deleteTransaction);

export default transactionRouter;
