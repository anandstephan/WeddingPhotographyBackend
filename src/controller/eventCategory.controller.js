import { EventCategory } from '../model/eventCategory.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import s3ServiceWithProgress from '../config/awsS3.config.js';
import { isValidObjectId } from '../utils/helper.js';

const s3Service = new s3ServiceWithProgress();
/*-----------------------------------Create a new Event Category----------------------------------*/
const createEventCategory = asyncHandler(async (req, res) => {
    const { name, type } = req.body;
    let imageUrl;

    // Validate required fields
    if (!name || !type) {
        throw new ApiError(400, "Name and type are required!");
    }

    // Validate type
    const validTypes = ['wedding', 'engagement', 'anniversary', 'events', 'birthday', 'other'];
    if (!validTypes.includes(type)) {
        throw new ApiError(400, `Invalid type. Valid types are: ${validTypes.join(', ')}`);
    }
    const existedCategory = await EventCategory.findOne({ name: { $regex: name, $options: "i" } });
    if (existedCategory) {
        return res.status(409).json(new ApiResponse(409, null, "Name already exists"));
    }

    if (req.file) {
        const s3Path = `event_category_${Date.now()}_${req.file.originalname}`;
        const fileUrl = await s3Service.uploadFile(req.file, s3Path);
        imageUrl = fileUrl.url;
    }

    const eventCategory = new EventCategory({ name, imageUrl, type });
    const savedCategory = await eventCategory.save();
    res.status(201).json(new ApiResponse(201, savedCategory, "Event category created successfully"));
});

/*------------------------------------------ Get all Event Categories-----------------------------------------*/
const getAllEventCategories = asyncHandler(async (req, res) => {
    const { type } = req.query;

    // Add filter for type if provided
    const filter = type ? { type } : {};
    const eventCategories = await EventCategory.find(filter);

    if (!eventCategories || eventCategories.length === 0) {
        throw new ApiError(404, "No event categories found");
    }

    res.status(200).json(new ApiResponse(200, eventCategories, "Event categories fetched successfully"));
});

/*---------------------------------------- Get a single Event Category by ID--------------------------------*/
const getEventCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid event category ID format");
    }

    const eventCategory = await EventCategory.findById(id);

    if (!eventCategory) {
        throw new ApiError(404, "Event category not found");
    }

    res.status(200).json(new ApiResponse(200, eventCategory, "Event category fetched successfully"));
});

/*---------------------------------------------Update Event Category-----------------------------------------*/
const editEventCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, type } = req.body;
    let imageUrl;

    if (!id) {
        throw new ApiError(400, "Category ID is required!");
    }

    const eventCategory = await EventCategory.findById(id);

    if (!eventCategory) {
        throw new ApiError(404, "Event category not found");
    }

    if (name) {
        const existedCategory = await EventCategory.findOne({
            _id: { $ne: id },
            name: { $regex: name, $options: "i" },
        });
        if (existedCategory) {
            throw new ApiError(409, "Name already exists");
        }
        eventCategory.name = name;
    }

    if (type) {
        const validTypes = ['Wedding', 'Engagement', 'Anniversary', 'Event', 'Other'];
        if (!validTypes.includes(type)) {
            throw new ApiError(400, `Invalid type. Valid types are: ${validTypes.join(', ')}`);
        }
        eventCategory.type = type;
    }

    if (req.file) {
        const s3Path = `event_category_${Date.now()}_${req.file.originalname}`;
        const fileUrl = await s3Service.uploadFile(req.file, s3Path);
        imageUrl = fileUrl.url;

        if (eventCategory.imageUrl) {
            await s3Service.deleteFile(eventCategory.imageUrl);
        }

        eventCategory.imageUrl = imageUrl;
    }

    const updatedCategory = await eventCategory.save();
    res.status(200).json(new ApiResponse(200, updatedCategory, "Event category updated successfully"));
});

/*---------------------------------------- Delete an Event Category-------------------------------------*/
const deleteEventCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const eventCategory = await EventCategory.findById(id);

    if (!eventCategory) {
        throw new ApiError(404, "Event category not found");
    }

    if (eventCategory.imageUrl) {
        try {
            await s3Service.deleteFile(eventCategory.imageUrl);
        } catch (err) {
            throw new ApiError(500, "Error deleting associated image from S3");
        }
    }

    await EventCategory.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, null, "Event category deleted successfully"));
});

const getCategoriesGroupedByType = asyncHandler(async (req, res) => {
    const categories = await EventCategory.aggregate([
        {
            $group: {
                _id: "$type",
                categories: { $push: { _id: "$_id", type: "$type", name: "$name", imageUrl: "$imageUrl", isActive: "$isActive" } }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    if (!categories || categories.length === 0) {
        throw new ApiError(404, "No event categories found");
    }

    res.status(200).json(new ApiResponse(200, categories, "Event categories grouped by type fetched successfully"));
});
export { createEventCategory, getAllEventCategories, getEventCategoryById, editEventCategory, deleteEventCategory, getCategoriesGroupedByType };
