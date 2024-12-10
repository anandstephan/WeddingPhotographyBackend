import express from 'express';
import { multerUpload } from '../middlewere/multer.middlewere.js';
import { createReview,editReview,getReviewsByPhotographer,deleteReview } from '../controller/reviews.controller.js';

const router = express.Router();

// Create a review
router.post('/', multerUpload.single('image'), createReview);

// Get reviews for a photographer
router.get('/:photographerId', getReviewsByPhotographer);

// Edit a review
router.put('/:id', multerUpload.single('image'), editReview);

// Delete a review
router.delete('/:id', deleteReview);

export default router;
