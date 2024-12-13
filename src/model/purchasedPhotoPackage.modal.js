import mongoose from 'mongoose';

const purchasedPackageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhotoPackage',
        required: true
    },
    photographerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    photosDelivered: {
        type: Number,
        default: 0
    },
    photosRemaining: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    }
}, { timestamps: true });

export const PurchasedPackage = mongoose.model('PurchasedPackage', purchasedPackageSchema);