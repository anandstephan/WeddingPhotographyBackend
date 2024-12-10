import { Review } from '../model/reviews.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import s3ServiceWithProgress from '../config/awsS3.config.js';

const s3Service = new s3ServiceWithProgress();

/*------------------------------------------------Create a Review---------------------------------------------*/

const createReview = asyncHandler(async (req, res) => {
    const { userId, photographerId, stars, comment } = req.body;
    let imageUrl;

    if (!userId || !photographerId || !stars) {
        throw new ApiError(400, "Required fields: stars, comment");
    }

    if (req.file) {
        const s3Path = `review_image_${Date.now()}_${req.file.originalname}`;
        const fileUrl = await s3Service.uploadFile(req.file, s3Path);
        imageUrl = fileUrl.url;
    }

    const review = new Review({
        userId,
        photographerId,
        stars,
        comment,
        imageUrl
    });

    const savedReview = await review.save();
    res.status(201).json(new ApiResponse(201, savedReview, "Review created successfully"));
});

/*--------------------------------------------------Get All Reviews----------------------------------*/
const getReviewsByPhotographer = asyncHandler(async (req, res) => {
    const { photographerId } = req.params;

    if (!photographerId) {
        throw new ApiError(400, "Photographer ID is required");
    }

    const reviews = await Review.find({ photographerId })
        .populate('userId', 'name')
        .sort({ createdAt: -1 });

    if (!reviews || reviews.length === 0) {
        throw new ApiError(404, "No reviews found for this photographer");
    }

    res.status(200).json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
});

const editReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { stars, comment } = req.body;
    let imageUrl;

    const review = await Review.findById(id);
    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    if (stars) review.stars = stars;
    if (comment) review.comment = comment;

    if (req.file) {
        const s3Path = `review_image_${Date.now()}_${req.file.originalname}`;
        const fileUrl = await s3Service.uploadFile(req.file, s3Path);
        imageUrl = fileUrl.url;

        if (review.imageUrl) {
            await s3Service.deleteFile(review.imageUrl);
        }

        review.imageUrl = imageUrl;
    }

    const updatedReview = await review.save();
    res.status(200).json(new ApiResponse(200, updatedReview, "Review updated successfully"));
});

const deleteReview = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    if (review.imageUrl) {
        try {
            await s3Service.deleteFile(review.imageUrl);
        } catch (err) {
            throw new ApiError(500, "Error deleting associated image from S3");
        }
    }

    await Review.findByIdAndDelete(id);
    res.status(200).json(new ApiResponse(200, null, "Review deleted successfully"));
});

export { createReview, getReviewsByPhotographer, editReview, deleteReview }