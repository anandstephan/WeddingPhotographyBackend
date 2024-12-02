import { PhotographerProfile } from "../model/photographerProfile.model.js";
import { User } from "../model/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { isValidObjectId } from "../utils/helper.js";

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

export { createProfile, updateProfile, getProfilebyId, deleteProfile };

