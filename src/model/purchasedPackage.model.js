import mongoose from "mongoose";

const purchasedPackageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoragePackage',
        required: true
    },
    storageLimit: {
        type: Number,
        required: true // in GB or TB
    },
    unit: {
        type: String,
        enum: ['GB', 'TB'],
        default: 'GB'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const PurchasedPackage = mongoose.model('PurchasedPackage', purchasedPackageSchema);
