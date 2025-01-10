import { PurchasedPackage } from "../model/purchasedPackage.model.js";
import { StoragePackage } from "../model/storagePackage.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { addMonths, addYears } from "date-fns";
import mongoose from "mongoose";

const purchachedPackageCreate = asyncHandler(async (req, res) => {
  const { paymentDetails, transaction } = req;
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
    packageId: transaction.subscription,
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

// Get purchased packageData details by ID
export const getPurchasedPackageById = async (req, res) => {
  try {
    const packageData = await PurchasedPackage.findById(req.params.id)
      .populate("packageId")
      .populate("photographerId", "name email profileImage")
      .populate("userId", "name email")
      .populate("transactionId");

    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: "Purchased packageData not found",
      });
    }

    res.status(200).json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update purchased packageData status
export const updatePackageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const packageData = await PurchasedPackage.findById(req.params.id);
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: "Purchased packageData not found",
      });
    }

    // Check if the status transition is valid
    const validTransitions = {
      active: ["completed", "cancelled"],
      completed: [], // completed is final state
      cancelled: [], // cancelled is final state
    };

    if (!validTransitions[packageData.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${packageData.status} to ${status}`,
      });
    }

    packageData.status = status;
    await packageData.save();

    res.status(200).json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update delivered photos count
export const updateDeliveredPhotos = async (req, res) => {
  try {
    const { deliveredCount } = req.body;
    const packageData = await PurchasedPackage.findById(req.params.id);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: "Purchased packageData not found",
      });
    }

    if (packageData.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Can only update photos for active packages",
      });
    }

    if (deliveredCount > packageData.photosRemaining) {
      return res.status(400).json({
        success: false,
        error: "Delivered count exceeds remaining photos",
      });
    }

    packageData.photosDelivered += deliveredCount;
    packageData.photosRemaining -= deliveredCount;

    // Automatically complete packageData if all photos are delivered
    if (packageData.photosRemaining === 0) {
      packageData.status = "completed";
    }

    await packageData.save();

    res.status(200).json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Get photographer's active packages
export const getPhotographerActivePackages = async (req, res) => {
  try {
    const photographerId = req.params.photographerId;
    const packages = await PurchasedPackage.find({
      photographerId,
      status: "active",
    })
      .populate("packageId")
      .populate("userId", "name email profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: packages,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Extend packageData expiry date
export const extendPackageExpiry = async (req, res) => {
  try {
    const { extensionDays } = req.body;
    const packageData = await PurchasedPackage.findById(req.params.id);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: "Purchased packageData not found",
      });
    }

    if (packageData.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Can only extend active packages",
      });
    }

    // Maximum extension limit of 30 days
    if (extensionDays > 30) {
      return res.status(400).json({
        success: false,
        error: "Maximum extension period is 30 days",
      });
    }
    packageData.expiryDate = new Date(
      packageData.expiryDate.getTime() + extensionDays * 24 * 60 * 60 * 1000
    );
    await packageData.save();

    res.status(200).json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Get packageData statistics for a photographer
export const getPhotographerPackageStats = async (req, res) => {
  try {
    const photographerId = req.params.photographerId;

    const stats = await PurchasedPackage.aggregate([
      {
        $match: {
          photographerId: mongoose.Types.ObjectId(photographerId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalPhotosDelivered: { $sum: "$photosDelivered" },
        },
      },
    ]);

    const formattedStats = {
      active: 0,
      completed: 0,
      cancelled: 0,
      totalPhotosDelivered: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
      formattedStats.totalPhotosDelivered += stat.totalPhotosDelivered;
    });

    res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export { purchachedPackageCreate, getUserPurchasedPackages };
