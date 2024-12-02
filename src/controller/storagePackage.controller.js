import { StoragePackage } from "../model/storagePackage.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { isValidObjectId } from "../utils/helper.js";
import { check, validationResult } from "express-validator";

/*--------------------------------------------inputValidator------------------------------------------*/
const inputValidations = [
    check("name")
        .notEmpty().withMessage(" Name is required!"),
    check("price")
        .notEmpty().withMessage("price is required!"),
    check("storageLimit")
        .notEmpty().withMessage("storageLimit is required!"),
    check("duration")
        .notEmpty().withMessage("duration is required!"),
    check("isActive")
        .notEmpty().withMessage("isActive is required!")
        .isBoolean().withMessage("isActive should be a boolean value (true or false)."),
];

/*--------------------------------------------create storage package------------------------------------------*/
const createStoragePackage = asyncHandler(async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(new ApiError(400, "Validation Error", errors));
    }
    const { name, storageLimit, price, duration, unit, durationUnit, isActive } = req.body;
    const packageExists = await StoragePackage.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' }
    });

    if (packageExists) {
        throw new ApiError(409, "Storage package with this name already exists");
    }

    const newPackage = new StoragePackage({
        name,
        storageLimit,
        unit,
        price,
        duration,
        durationUnit,
        isActive,
    });

    await newPackage.save();
    res.status(201).json(new ApiResponse(201, newPackage, "Storage package created successfully!"));
});

/*--------------------------------------------get all storage packages------------------------------------------*/
const getStoragePackages = asyncHandler(async (req, res) => {
    const packages = await StoragePackage.find();
    if (!packages || packages.length === 0) {
        throw new ApiError(404, 'No storage packages found');
    }

    res.status(200).json(new ApiResponse(200, packages, 'Storage packages retrieved successfully!'));
});

export const getStoragePackageById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError(400, 'Invalid package ID');
    }

    const storagePackage = await StoragePackage.findById(id);
    if (!storagePackage) {
        throw new ApiError(404, 'Storage package not found');
    }

    res.status(200).json(new ApiResponse(200, storagePackage, 'Storage package retrieved successfully!'));
});

/*--------------------------------------------update storage package------------------------------------------*/
const updateStoragePackage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, storageLimit, price, duration, isActive } = req.body;

    if (!isValidObjectId(id)) {
        throw new ApiError(400, 'Invalid package ID');
    }

    const packageExists = await StoragePackage.findOne({ name });
    if (packageExists && packageExists._id.toString() !== id) {
        throw new ApiError(409, 'Storage package with this name already exists');
    }

    const updatedPackage = await StoragePackage.findByIdAndUpdate(
        id,
        { name, storageLimit, price, duration, isActive },
        { new: true, runValidators: true }
    );

    if (!updatedPackage) {
        throw new ApiError(404, 'Storage package not found');
    }

    res.status(200).json(new ApiResponse(200, updatedPackage, 'Storage package updated successfully!'));
});

/*--------------------------------------------delete storage package------------------------------------------*/
const deleteStoragePackage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid package ID');
    }

    const deletedPackage = await StoragePackage.findByIdAndDelete(id);
    if (!deletedPackage) {
        throw new ApiError(404, 'Storage package not found');
    }
    res.status(200).json(new ApiResponse(200, null, 'Storage package deleted successfully!'));
});



export { createStoragePackage, inputValidations, getStoragePackages, updateStoragePackage, deleteStoragePackage }