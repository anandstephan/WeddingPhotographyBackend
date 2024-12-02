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
    unit:{
        type: String,
        enum: ['GB', 'TB'],
        default: 'GB'
    },
    price: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true // in months
    },
    durationUnit: {
        type: String,
        enum: ['months', 'years'],
        default: 'years'
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

export const StoragePackage = mongoose.model('StoragePackage', storagePackageSchema);