import { PhotographerProfile } from "../model/photographerProfile.model.js";
import { User } from "../model/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { isValidObjectId } from "../utils/helper.js";
import mongoose from "mongoose";
import s3ServiceWithProgress from "../config/awsS3.config.js";

const s3Service = new s3ServiceWithProgress();
/*---------------------------------------------create profile----------------------------------------*/
const createProfile = asyncHandler(async (req, res) => {
  const { bio, specializations, experience } = req.body;
  const userId = req.user._id;
  if (req.user.role !== "photographer") {
    throw new ApiError(404, "User not found or not a photographer");
  }
  const existingProfile = await PhotographerProfile.findOne({ userId });
  if (existingProfile) {
    throw new ApiError(400, "Photographer profile already exists");
  }
  const newProfile = new PhotographerProfile({
    userId,
    bio,
    specializations,
    experience,
  });
  await newProfile.save();
  res.status(201).json({
    message: "Photographer profile created successfully",
    profile: newProfile,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const id = req.user._id;
  const { bio, specializations, experience } = req.body;

  const updatedProfile = await PhotographerProfile.findOneAndUpdate(
    { userId: id },
    { bio, specializations, experience },
    { new: true, runValidators: false }
  );

  if (!updatedProfile) {
    throw new ApiError(404, "Photographer profile not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "profile updated successfully!")
    );
});

const getProfilebyId = asyncHandler(async (req, res) => {
  const id = req.user._id;
  const profile = await PhotographerProfile.findOne({ userId: id }).populate(
    "userId",
    "name mobile email role"
  );

  if (!profile) {
    throw new ApiError(404, "Photographer profile not found");
  }
  const profileObj = profile.toObject();
  const flattenedProfile = {
    ...profileObj,
    ...profileObj.userId,
    userId: profileObj.userId._id,
  };
  delete flattenedProfile.userId._id;
  delete flattenedProfile._id;
  res
    .status(200)
    .json(
      new ApiResponse(200, flattenedProfile, "Profile fetched successfully!")
    );
});

const deleteProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const deletedProfile = await PhotographerProfile.findOneAndDelete(
      { userId },
      { session }
    );
    if (!deletedProfile) {
      throw new ApiError(404, "Photographer profile not found");
    }

    const deletedUser = await User.findByIdAndDelete(userId, { session });
    if (!deletedUser) {
      throw new ApiError(404, "User not found!");
    }

    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json(ApiResponse(200, null, "Profile and user deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

const getPhotographerProfile = asyncHandler(async (req, res) => {
  const { photographerId } = req.params;
  if (!photographerId || !isValidObjectId(photographerId)) {
    throw new ApiError(400, "Invalid photographer ID");
  }

  const photographerData = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(photographerId),
        role: "photographer",
      },
    },
    {
      $lookup: {
        from: "photographerprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile",
      },
    },
    {
      $unwind: "$profile",
    },
    {
      // First lookup to get rating statistics
      $lookup: {
        from: "reviews",
        let: { photographer_id: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$photographerId", "$$photographer_id"],
              },
            },
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$stars" },
              totalReviews: { $sum: 1 },
            },
          },
        ],
        as: "ratingStats",
      },
    },
    {
      // Second lookup to get recent reviews
      $lookup: {
        from: "reviews",
        let: { photographer_id: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$photographerId", "$$photographer_id"],
              },
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $limit: 10,
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "reviewer",
            },
          },
          {
            $unwind: "$reviewer",
          },
          {
            $project: {
              stars: 1,
              comment: 1,
              imageUrl: 1,
              createdAt: 1,
              "reviewer.name": 1,
              "reviewer.avatarUrl": 1,
            },
          },
        ],
        as: "recentReviews",
      },
    },
    {
      $project: {
        name: 1,
        profileImage: "$avatarUrl",
        avatarUrl: 1,
        city: { $ifNull: ["$address.city", ""] },
        about: "$profile.bio",
        specializations: "$profile.specializations",
        portfolio: {
          $map: {
            input: "$profile.portfolio",
            as: "folder",
            in: {
              folderName: "$$folder.folderName",
              photos: "$$folder.photos",
            },
          },
        },
        rating: {
          $round: [
            {
              $ifNull: [{ $arrayElemAt: ["$ratingStats.averageRating", 0] }, 0],
            },
            1,
          ],
        },
        reviewCount: {
          $ifNull: [{ $arrayElemAt: ["$ratingStats.totalReviews", 0] }, 0],
        },
        recentReviews: 1,
      },
    },
  ]);

  if (!photographerData || photographerData.length === 0) {
    throw new ApiError(404, "Photographer not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        photographerData[0],
        "Photographer profile fetched successfully"
      )
    );
});

const createFolderWithPhotos = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { folderName } = req.body;
  const files = req.files || [];
  const user = req.user;

  if (!folderName) {
    throw new Error("Folder name is required");
  }

  const photographer = await PhotographerProfile.findOne({ userId });

  if (!photographer) {
    throw new Error("Photographer profile not found");
  }

  if (
    photographer.portfolio.some((folder) => folder.folderName === folderName)
  ) {
    throw new Error("Folder with this name already exists");
  }
  if (!files) {
    throw new Error("No photos selected to upload");
  }
  if (files.length > 5) {
    throw new Error("Maximum 5 photos can be uploaded per folder");
  }

  const uploadedPhotos = [];
  for (const file of files) {
    const fileKey = `portfolio/${user.mobile}/${Date.now()}_${
      file.originalname
    }`;
    const uploadResult = await s3Service.uploadFile(file, fileKey, (progress) =>
      console.log(`Upload Progress: ${progress}%`)
    );
    uploadedPhotos.push(uploadResult.url);
  }

  photographer.portfolio.push({
    folderName,
    photos: uploadedPhotos,
  });
  await photographer.save();

  res.status(201).json({
    message: "Folder created with photos successfully",
    folderName,
    photos: uploadedPhotos,
  });
});

const removeImagesFromFolder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { folderName, photosToRemove } = req.body;

  if (!folderName || !Array.isArray(photosToRemove)) {
    throw new Error("Folder name and a list of photos to remove are required");
  }

  const photographer = await PhotographerProfile.findOne({ userId });

  if (!photographer) {
    throw new Error("Photographer profile not found");
  }

  const folder = photographer.portfolio.find(
    (folder) => folder.folderName === folderName
  );

  if (!folder) {
    throw new Error("Folder not found");
  }

  // Remove photos from S3 and the database
  for (const photoUrl of photosToRemove) {
    try {
      await s3Service.deleteFile(photoUrl);
    } catch (err) {
      console.error(`Error deleting photo ${photoUrl} from S3`, err.message);
    }
  }

  folder.photos = folder.photos.filter(
    (photo) => !photosToRemove.includes(photo)
  );
  await photographer.save();

  res.status(200).json({
    message: "Photos removed successfully",
    remainingPhotos: folder.photos,
  });
});

const deleteFolder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { folderName } = req.body;

  if (!folderName) {
    throw new Error("Folder name is required");
  }

  const photographer = await PhotographerProfile.findOne({ userId });

  if (!photographer) {
    throw new Error("Photographer profile not found");
  }

  const folderIndex = photographer.portfolio.findIndex(
    (folder) => folder.folderName === folderName
  );

  if (folderIndex === -1) {
    throw new Error("Folder not found");
  }

  const folder = photographer.portfolio[folderIndex];

  // Delete all photos in the folder from S3
  for (const photoUrl of folder.photos) {
    try {
      await s3Service.deleteFile(photoUrl);
    } catch (err) {
      console.error(`Error deleting photo ${photoUrl} from S3`, err.message);
    }
  }

  // Remove folder from the database
  photographer.portfolio.splice(folderIndex, 1);
  await photographer.save();

  res.status(200).json({ message: "Folder deleted successfully" });
});

const addPhotosToFolder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { folderName } = req.body;
  const files = req.files || [];
  const user = req.user;

  if (!folderName || files.length === 0) {
    throw new Error("Folder name and at least one photo file are required");
  }

  const photographer = await PhotographerProfile.findOne({ userId });

  if (!photographer) {
    throw new Error("Photographer profile not found");
  }

  const folder = photographer.portfolio.find(
    (folder) => folder.folderName === folderName
  );

  if (!folder) {
    throw new Error("Folder not found");
  }
  const totalPhotos = folder.photos.length + files.length;
  if (totalPhotos > 5) {
    throw new Error("The folder cannot have more than 5 photos");
  }

  // Upload files to S3
  const uploadedPhotos = [];
  for (const file of files) {
    const fileKey = `portfolio/${user.mobile}/${Date.now()}_${
      file.originalname
    }`;
    const uploadResult = await s3Service.uploadFile(file, fileKey, (progress) =>
      console.log(`Upload Progress: ${progress}%`)
    );
    uploadedPhotos.push(uploadResult.url);
  }

  // Update folder with new photos
  folder.photos.push(...uploadedPhotos);
  await photographer.save();

  res
    .status(200)
    .json({ message: "Photos added successfully", photos: uploadedPhotos });
});

const getPhotographersList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, city } = req.query;
  const { events } = req.body;
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;
  const eventsList = events ? events : [];
  if (!Array.isArray(eventsList)) {
    throw new ApiError(400, "Events must be an array");
  }

  const matchQuery = {
    role: "photographer",
    isActive: true,
  };

  const specializationConditions =
    eventsList.length > 0
      ? {
          $match: {
            $or: eventsList.map((event) => ({
              "profile.specializations": {
                $regex: new RegExp(event.trim(), "i"),
              },
            })),
          },
        }
      : null;

  const pipeline = [
    {
      $match: matchQuery,
    },
    {
      $lookup: {
        from: "photographerprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile",
      },
    },
    {
      $unwind: "$profile",
    },
    // Add regex matching for specializations if events are provided
    ...(specializationConditions ? [specializationConditions] : []),
    // Lookup reviews for rating calculation
    {
      $lookup: {
        from: "reviews",
        let: { photographer_id: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$photographerId", "$$photographer_id"],
              },
            },
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$stars" },
              totalReviews: { $sum: 1 },
            },
          },
        ],
        as: "ratingStats",
      },
    },
    // Filter by city if provided
    ...(city
      ? [
          {
            $match: {
              "profile.address.city": new RegExp(city, "i"), // Fixed: Changed to profile.address.city
            },
          },
        ]
      : []),
    // Add a field to count matching specializations for better relevance sorting
    ...(eventsList.length > 0
      ? [
          {
            $addFields: {
              matchingSpecializationsCount: {
                $size: {
                  $filter: {
                    input: "$profile.specializations",
                    as: "specialization",
                    cond: {
                      $or: eventsList.map((event) => ({
                        $regexMatch: {
                          input: "$$specialization",
                          regex: new RegExp(event.trim(), "i"),
                        },
                      })),
                    },
                  },
                },
              },
            },
          },
        ]
      : []),
    // Project final fields
    {
      $project: {
        _id: 1,
        name: 1,
        avatarUrl: 1,
        city: { $ifNull: ["$address.city", ""] },
        specializations: { $ifNull: ["$profile.specializations", []] },
        rating: {
          $round: [
            {
              $ifNull: [{ $arrayElemAt: ["$ratingStats.averageRating", 0] }, 0],
            },
            1,
          ],
        },
        reviewCount: {
          $ifNull: [{ $arrayElemAt: ["$ratingStats.totalReviews", 0] }, 0],
        },
        matchingSpecializationsCount: {
          $ifNull: ["$matchingSpecializationsCount", 0],
        },
      },
    },
    {
      $sort: {
        matchingSpecializationsCount: -1,
        rating: -1,
        reviewCount: -1,
      },
    },
  ];

  // Get total count before pagination
  const totalDocs = await User.aggregate([...pipeline, { $count: "total" }]);
  const total = totalDocs.length > 0 ? totalDocs[0].total : 0;
  pipeline.push({ $skip: skip }, { $limit: limitNumber });

  const photographers = await User.aggregate(pipeline);

  // Remove matchingSpecializationsCount from final output
  const cleanedPhotographers = photographers.map(
    ({ matchingSpecializationsCount, ...rest }) => rest
  );

  // Prepare pagination info
  const totalPages = Math.ceil(total / limitNumber);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        photographers: cleanedPhotographers,
        pagination: {
          currentPage: pageNumber,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limitNumber,
        },
      },
      "Photographers fetched successfully"
    )
  );
});

export {
  createProfile,
  updateProfile,
  getProfilebyId,
  deleteProfile,
  getPhotographerProfile,
  createFolderWithPhotos,
  removeImagesFromFolder,
  deleteFolder,
  addPhotosToFolder,
  getPhotographersList,
};
