import mongoose from "mongoose";

const photoSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    s3Path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

export const Photo = mongoose.model('Photo', photoSchema);