import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Transaction } from "../model/transaction.model.js";
import { StoragePackage } from "../model/storagePackage.model.js";
import { isValidObjectId } from "../utils/helper.js";
import { generateTransactionId } from "../utils/helper.js";
import { razorpay } from "../config/razorPayConfig.js";

/*----------------------------------------------create transaction------------------------------------------*/

const createTransaction = asyncHandler(async (req, res) => {
  const { packageId, paymentMethod } = req.body;
  const userId = req.user._id;
  const transactionExists = await Transaction.findOne({ userId, packageId });
  if (transactionExists) {
    throw new ApiError(409, "Transaction with this ID already exists");
  }
  if (!isValidObjectId(packageId)) {
    throw new ApiError(400, "Invalid package ID");
  }
  const storagepPackage = await StoragePackage.findById(packageId);
  if (!storagepPackage) {
    throw new ApiError(404, "Storage package not found");
  }
  const transactionStr = generateTransactionId();
  const newTransaction = new Transaction({
    userId,
    packageId,
    amount: storagepPackage.price,
    paymentMethod,
    transactionId: transactionStr,
  });
  await newTransaction.save();
  res
    .status(201)
    .json(
      new ApiResponse(201, newTransaction, "Transaction created successfully")
    );
});

/*----------------------------------------------get all transactions------------------------------------------*/

const getAllTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    type,
    endDate,
    startDate,
    paymentStatus,
    sortkey = "createdAt",
    sortdir = "desc",
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  // Build match conditions for aggregation
  const matchConditions = {};

  // Add date range filter if provided
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) {
      matchConditions.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchConditions.createdAt.$lte = new Date(endDate);
    }
  }

  // Add payment status filter if provided
  if (paymentStatus) {
    matchConditions.paymentStatus = paymentStatus;
  }

  // Add type filter if provided
  if (type) {
    matchConditions.type = type;
  }

  // Add search conditions
  if (search) {
    matchConditions.$or = [
      { "user.name": { $regex: search, $options: "i" } },
      { transactionId: { $regex: search, $options: "i" } },
      { paymentMethod: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
    ];
  }

  // Count pipeline
  const countPipeline = [
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: matchConditions,
    },
    {
      $count: "totalItems",
    },
  ];

  const countResult = await Transaction.aggregate(countPipeline);
  const totalItems = countResult[0]?.totalItems || 0;
  const totalPages = Math.ceil(totalItems / limitNumber);

  // Data pipeline
  const dataPipeline = [
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "photopackages",
        localField: "packageId",
        foreignField: "_id",
        as: "photoPackage",
      },
    },
    {
      $lookup: {
        from: "storagepackages",
        localField: "packageId",
        foreignField: "_id",
        as: "storagePackage",
      },
    },
    {
      $addFields: {
        package: {
          $cond: {
            if: { $eq: ["$type", "photographer"] },
            then: { $arrayElemAt: ["$photoPackage", 0] },
            else: { $arrayElemAt: ["$storagePackage", 0] },
          },
        },
      },
    },
    {
      $match: matchConditions,
    },
    {
      $sort: { [sortkey]: sortdir === "desc" ? -1 : 1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limitNumber,
    },
    {
      $project: {
        _id: 1,
        type: 1,
        amount: 1,
        paymentStatus: 1,
        paymentMethod: 1,
        transactionId: 1,
        createdAt: 1,
        packageId: 1,
        "user._id": 1,
        "user.name": 1,
        "user.email": 1,
        "package._id": 1,
        "package.name": 1,
        "package.price": 1,
        "package.duration": 1,
        "package.storage": 1,
        "package.features": 1,
      },
    },
  ];

  const dataResult = await Transaction.aggregate(dataPipeline);

  // Response
  res.status(200).json(
    new ApiResponse(
      200,
      {
        result: dataResult,
        pagination: {
          totalItems,
          currentPage: pageNumber,
          itemsPerPage: limitNumber,
          totalPages,
        },
      },
      "Transactions fetched successfully!"
    )
  );
});


/*----------------------------------------------get transaction by id------------------------------------------*/

const getTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res
        .status(404)
        .json(new ApiError(404, null, "Transaction not found!"));
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, transaction, "Transaction fetched successfully!")
      );
  } catch (error) {
    console.error("Error fetching transaction by id:", error.message);
    res.status(500).json(new ApiError(500, null, "Internal server error"));
  }
});

/*----------------------------------------------update transaction------------------------------------------*/

const updateTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { status } = req.body;

  if (!isValidObjectId(transactionId)) {
    throw new ApiError(400, "Invalid transaction ID");
  }

  // Update transaction and return the updated document
  const updatedTransaction = await Transaction.findByIdAndUpdate(
    transactionId,
    { $set: status },
    { new: true, runValidators: true }
  );

  if (!updatedTransaction) {
    throw new ApiError(404, "Transaction not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedTransaction,
        "Transaction updated successfully"
      )
    );
});

const updateTransactionDetails = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { razorpay_payment_id } = req.body;

  if (!isValidObjectId(transactionId)) {
    throw new ApiError(400, "Invalid transaction ID");
  }
  const payment = await razorpay.payments.fetch(razorpay_payment_id);
  const transaction = await Transaction.findById(transactionId);
  console.log("transaction", transaction);

  if (!transaction) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Transaction not found"));
  }

  transaction.transactionId = payment.id;
  transaction.paymentDetails = payment;
  transaction.paymentStatus = payment.status;
  transaction.paymentMethod = payment.method;
  const updatedTransaction = await transaction.save();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedTransaction,
        "Transaction updated successfully"
      )
    );
});

export {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  updateTransactionDetails,
};
