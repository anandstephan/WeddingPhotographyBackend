import { PhotographerProfile } from "../model/photographerProfile.model.js";
import { User } from "../model/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { isValidObjectId } from "../utils/helper.js";
import mongoose from "mongoose";
/*---------------------------------------------create profile----------------------------------------*/
const createProfile = asyncHandler(async (req, res) => {
    const { bio, specializations } = req.body;
    const userId = req.user._id;
    if (req.user.role !== "photographer") {
        throw new ApiError(404, 'User not found or not a photographer');
    }
    const existingProfile = await PhotographerProfile.findOne({ userId });
    if (existingProfile) {
        throw new ApiError(400, 'Photographer profile already exists');
    }
    const newProfile = new PhotographerProfile({
        userId,
        bio,
        specializations,
    });
    await newProfile.save();
    res.status(201).json({ message: 'Photographer profile created successfully', profile: newProfile });

})

const updateProfile = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const { bio, specializations } = req.body;

    const updatedProfile = await PhotographerProfile.findOneAndUpdate(
        { userId: id },
        { bio, specializations },
        { new: true, runValidators: false }
    );

    if (!updatedProfile) {
        throw new ApiError(404, 'Photographer profile not found');
    }

    res.status(200).json(new ApiResponse(200, updatedProfile, "profile updated successfully!"));
});

const getProfilebyId = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const profile = await PhotographerProfile.findOne({ userId: id })
        .populate("userId", "name mobile email role");

    if (!profile) {
        throw new ApiError(404, 'Photographer profile not found');
    }
    const profileObj = profile.toObject();
    const flattenedProfile = {
        ...profileObj,
        ...profileObj.userId,
        userId: profileObj.userId._id,
    };
    delete flattenedProfile.userId._id;
    delete flattenedProfile._id;
    res.status(200).json(new ApiResponse(200, flattenedProfile, "Profile fetched successfully!"));
});


const deleteProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, 'Invalid user ID');
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const deletedProfile = await PhotographerProfile.findOneAndDelete({ userId }, { session });
        if (!deletedProfile) {
            throw new ApiError(404, 'Photographer profile not found');
        }

        const deletedUser = await User.findByIdAndDelete(userId, { session });
        if (!deletedUser) {
            throw new ApiError(404, 'User not found');
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json(ApiResponse(200, null, 'Profile and user deleted successfully'));
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
                role: "photographer"
            }
        },
        {
            $lookup: {
                from: "photographerprofiles",
                localField: "_id",
                foreignField: "userId",
                as: "profile"
            }
        },
        {
            $unwind: "$profile"
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
                                $eq: ["$photographerId", "$$photographer_id"]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            averageRating: { $avg: "$stars" },
                            totalReviews: { $sum: 1 }
                        }
                    }
                ],
                as: "ratingStats"
            }
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
                                $eq: ["$photographerId", "$$photographer_id"]
                            }
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $limit: 10
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "reviewer"
                        }
                    },
                    {
                        $unwind: "$reviewer"
                    },
                    {
                        $project: {
                            stars: 1,
                            comment: 1,
                            imageUrl: 1,
                            createdAt: 1,
                            "reviewer.name": 1,
                            "reviewer.avatarUrl": 1
                        }
                    }
                ],
                as: "recentReviews"
            }
        },
        {
            $project: {
                name: 1,
                profileImage: "$avatarUrl",
                about: "$profile.bio",
                specializations: "$profile.specializations",
                portfolio: {
                    $map: {
                        input: "$profile.portfolio",
                        as: "folder",
                        in: {
                            folderName: "$$folder.folderName",
                            photos: "$$folder.photos"
                        }
                    }
                },
                rating: {
                    $round: [
                        {
                            $ifNull: [
                                { $arrayElemAt: ["$ratingStats.averageRating", 0] },
                                0
                            ]
                        },
                        1
                    ]
                },
                reviewCount: {
                    $ifNull: [
                        { $arrayElemAt: ["$ratingStats.totalReviews", 0] },
                        0
                    ]
                },
                recentReviews: 1
            }
        }
    ]);

    if (!photographerData || photographerData.length === 0) {
        throw new ApiError(404, "Photographer not found");
    }

    return res.status(200).json(
        new ApiResponse(200, photographerData[0], "Photographer profile fetched successfully")
    );
});



export { createProfile, updateProfile, getProfilebyId, deleteProfile, getPhotographerProfile };

