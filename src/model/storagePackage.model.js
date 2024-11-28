import mongoose from 'mongoose';

const storagePackageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    storageLimit: {
        type: Number,
        required: true // in GB
    },
    price: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true // in months
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

export const StoragePackage = mongoose.model('StoragePackage', storagePackageSchema);