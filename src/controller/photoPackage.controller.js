import { PhotoPackage } from '../model/photoPackage.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

/*-------------------------------------------Create Photo Package---------------------------------------*/
const createPhotoPackage = asyncHandler(async (req, res) => {
    const { name, photoCount, price } = req.body;
    const user = req.user;
    if (!name || !photoCount || !price) {
        throw new ApiError(400, "All fields are required");
    }
    const existingPackage = await PhotoPackage.findOne({ photographerId: user._id, photoCount })
    if (existingPackage) {
        throw new ApiError(409, "Photo package with this photo count already exists");
    }
    const newPhotoPackage = new PhotoPackage({ photographerId:user._id, name, photoCount, price });
    await newPhotoPackage.save();
    res.status(201).json(new ApiResponse(201, newPhotoPackage, "Photo package created successfully"));
});

/*-------------------------------------------Get All Photo Packages---------------------------------------*/
const getAllPhotoPackages = asyncHandler(async (req, res) => {
    const { photographerId } = req.params
    const photoPackages = await PhotoPackage.find({ photographerId });
    if (!photoPackages || photoPackages.length === 0) {
        throw new ApiError(404, "No photo packages found for this photographer");
    }
    res.status(200).json(new ApiResponse(200, photoPackages, "Photo packages fetched successfully"));
});

/*-------------------------------------------Get Photo Package By ID---------------------------------------*/
const getPhotoPackageById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const photoPackage = await PhotoPackage.findById(id);
    if (!photoPackage) {
        throw new ApiError(404, "Photo package not found");
    }

    res.status(200).json(new ApiResponse(200, photoPackage, "Photo package fetched successfully"));
});

/*-------------------------------------------Update Photo Package---------------------------------------*/
const updatePhotoPackage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const updatedPhotoPackage = await PhotoPackage.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedPhotoPackage) {
        throw new ApiError(404, "Photo package not found");
    }

    res.status(200).json(new ApiResponse(200, updatedPhotoPackage, "Photo package updated successfully"));
});

/*-------------------------------------------Delete Photo Package---------------------------------------*/
const deletePhotoPackage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedPhotoPackage = await PhotoPackage.findByIdAndDelete(id);
    if (!deletedPhotoPackage) {
        throw new ApiError(404, "Photo package not found");
    }

    res.status(200).json(new ApiResponse(200, null, "Photo package deleted successfully"));
});

export {
    createPhotoPackage,
    getAllPhotoPackages,
    getPhotoPackageById,
    updatePhotoPackage,
    deletePhotoPackage,
};
