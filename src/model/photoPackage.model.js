import mongoose from 'mongoose';

const photoPackageSchema = new mongoose.Schema(
    {
        photographerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        photoCount: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

// Correct export syntax
export const PhotoPackage = mongoose.model('PhotoPackage', photoPackageSchema);
