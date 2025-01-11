import { PurchasedPackage } from "../model/purchasedPackage.model.js";
import { StoragePackage } from "../model/storagePackage.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { addMonths, addYears } from "date-fns";
import mongoose from "mongoose";

const purchachedPackageCreate = asyncHandler(async (req, res) => {
  const { paymentDetails, transaction } = req;
  console.log(paymentDetails, "paymentDetails");
  console.log(transaction, "transaction");

  const user = req.user;
  transaction.paymentDetails = paymentDetails;
  transaction.paymentStatus = paymentDetails.paymentStatus;
  transaction.paymentMethod = paymentDetails.method;
  const savedTransaction = transaction.save();

  if (paymentDetails.status !== "captured") {
    return res
      .status(402)
      .json(new ApiResponse(402, paymentDetails, "Payment failed!"));
  }
  const storagePackage = await StoragePackage.findById(transaction.packageId);
  if (!storagePackage) {
    throw new ApiError(404, "Subscription plan not found.");
  }

  const existingPlan = await PurchasedPackage.findOne({
    userId: user._id,
    // packageId: transaction.packageId,
    isActive: true,
  });
  if (existingPlan) {
    throw new ApiError(409, "User already has a subscription plan active.");
  }

  const startDate = new Date();
  let endDate;
  endDate = addMonths(startDate, storagePackage.duration);
  const newSubscribedPlan = await PurchasedPackage.create({
    userId: user._id,
    packageId: transaction.packageId,
    storageLimit: storagePackage.storageLimit,
    unit: storagePackage.unit,
    transactionId: transaction._id,
    startDate: startDate,
    endDate: endDate,
  });
  res.status(201).json(
    new ApiResponse(
      201,
      {
        subscriptionDetails: newSubscribedPlan,
        transactionDetails: savedTransaction,
      },
      "Subscription successful!"
    )
  );
});
/*-------------------------- Get all purchased packages for a user------------------------*/

const getUserPurchasedPackages = asyncHandler(async (req, res) => {
  let userId = req.user?._id;
  if (req.user.role === "admin") {
    userId = req.params.userId;
  }

  const packages = await PurchasedPackage.aggregate([
    {
      $match: { userId: mongoose.Types.ObjectId(userId), isActive: true },
    },
    {
      $lookup: {
        from: "storagepackages",
        localField: "packageId",
        foreignField: "_id",
        as: "packageDetails",
      },
    },
    {
      $unwind: {
        path: "$packageDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "transactions",
        localField: "transactionId",
        foreignField: "_id",
        as: "transactionDetails",
      },
    },
    {
      $unwind: {
        path: "$transactionDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        storageLimit: 1,
        unit: 1,
        startDate: 1,
        endDate: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        "packageDetails.name": 1,
        "transactionDetails.amount": 1,
        "transactionDetails.paymentMethod": 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  if (!packages.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No active subscriptions found"));
  }
  res
    .status(200)
    .json(new ApiResponse(200, packages[0], "Active packages fatched"));
});

/*--------------------- Get purchased packageData details by ID---------------------*/
const getPurchasedPackageById = asyncHandler(async (req, res) => {
  const packageData = await PurchasedPackage.findById(req.params.id)
    .populate("packageId")
    .populate("userId", "-password -refreshToken")
    .populate("transactionId");

  if (!packageData) {
    throw new ApiError(404, "Purchased packageData not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, packageData, "package fatched successfully"));
});

/*------------------------------------ Get purchased package list------------------------------------*/
const getPurchasedPackageList = asyncHandler(async (req, res) => {
  const { name, page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  const matchStage = {
    $match: {
      isActive: true,
    },
  };

  const lookupStages = [
    {
      $lookup: {
        from: "packages",
        localField: "packageId",
        foreignField: "_id",
        as: "packageDetails",
      },
    },
    {
      $unwind: {
        path: "$packageDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "transactions",
        localField: "transactionId",
        foreignField: "_id",
        as: "transactionDetails",
      },
    },
    {
      $unwind: {
        path: "$transactionDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const projectStage = {
    $project: {
      "userDetails.password": 0,
      "userDetails.refreshToken": 0,
    },
  };

  const nameFilterStage = name
    ? {
        $match: {
          "userDetails.name": { $regex: name, $options: "i" },
        },
      }
    : null;

  const paginationStages = [
    { $skip: (pageNumber - 1) * limitNumber },
    { $limit: limitNumber },
  ];

  const pipeline = [matchStage, ...lookupStages, projectStage];
  if (nameFilterStage) pipeline.push(nameFilterStage);
  pipeline.push(...paginationStages);
  const packageList = await PurchasedPackage.aggregate(pipeline);

  const totalPackages = await PurchasedPackage.countDocuments({
    isActive: true,
    ...(name ? { "userDetails.name": { $regex: name, $options: "i" } } : {}),
  });

  res.status(200).json({
    success: true,
    data: packageList,
    pagination: {
      currentPage: pageNumber,
      totalPages: totalPackages,
      totalItems: Math.ceil(totalPackages / limitNumber),
      itemsPerPage: limitNumber,
    },
  });
});

export {
  purchachedPackageCreate,
  getUserPurchasedPackages,
  getPurchasedPackageById,
  getPurchasedPackageList,
};
