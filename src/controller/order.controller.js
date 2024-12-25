import { Transaction } from "../model/transaction.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { StoragePackage } from "../model/storagePackage.model.js";
import { PhotoPackage } from "../model/photoPackage.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { isValidObjectId } from "../utils/helper.js";
import { createOrder as initiateOrder } from "../config/razorPayConfig.js";
import { uid } from "uid";
import { razorpay } from "../config/razorPayConfig.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";
/*-----------------------------------------create order-----------------------------------------*/

const createOrder = asyncHandler(async (req, res) => {
  const { packageId, currency = "INR" } = req.body;
  const user = req.user;
  console.log(user, "user");
  if (!packageId || !isValidObjectId(packageId)) {
    throw new ApiError(400, "Invalid package ID");
  }

  let packageData;
  if (user.role === "photographer") {
    packageData = await StoragePackage.findOne({
      _id: packageId,
      isActive: true,
    });
    if (!packageData) {
      throw new ApiError(404, "Storage package not found");
    }
  } else if (user.role === "user") {
    packageData = await PhotoPackage.findOne({ _id: packageId });
    if (!packageData) {
      throw new ApiError(404, "Photo package not found");
    }
  } else {
    throw new ApiError(400, "Invalid user type");
  }

  // Calculate payment amount
  const amountToPay = packageData.price;

  let transactionId = null;
  let paymentResponse = null;

  if (user.role === "photographer") {
    // Initiate Razorpay payment for photographers
    transactionId = `TXN_${uid()}`;
    try {
      paymentResponse = await initiateOrder(
        amountToPay,
        transactionId,
        currency
      );
    } catch (error) {
      throw new ApiError(error.statusCode, error.error);
    }
  }
  // Save transaction to the database
  const transaction = new Transaction({
    type: user.role,
    userId: user._id,
    packageId: packageData._id,
    amount: amountToPay,
    currency: currency,
    transactionId: paymentResponse ? paymentResponse.order_id : "",
    paymentStatus: "initiated",
  });
  await transaction.save();
  if (!paymentResponse) {
    paymentResponse = transaction;
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, paymentResponse, "Order initiated successfully")
    );
});

const verifyOrder = asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const secret = process.env.CLIENT_SECRET;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      secret
    );
    console.log("isValidSignature", isValidSignature);

    if (!isValidSignature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log("payment", payment);
    const transaction = await Transaction.findOne({
      $or: [
        { transactionId: razorpay_order_id },
        { transactionId: razorpay_payment_id },
      ],
    });
    console.log("transaction", transaction);
    transaction.transactionId = payment.id;
    req.paymentDetails = payment;
    req.transaction = transaction;
    next();
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    return res
      .status(500)
      .json({ error: "Error verifying payment", details: error.message });
  }
});

export { createOrder, verifyOrder };
