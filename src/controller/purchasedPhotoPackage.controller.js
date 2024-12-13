// purchasedPackageController.js
import { PurchasedPackage } from '../models/purchasedPackageSchema';
import { PhotoPackage } from '../models/photoPackageSchema';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';


const purchachedPackageCreate = asyncHandler(async(req,res)=>{
const user = req.user;


})
// Get all purchased packages for a user
export const getUserPurchasedPackages = async (req, res) => {
    try {
        const userId = req.params.userId;
        const packages = await PurchasedPackage.find({ userId })
            .populate('packageId')
            .populate('photographerId', 'name email profileImage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: packages
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Get purchased packageData details by ID
export const getPurchasedPackageById = async (req, res) => {
    try {
        const packageData = await PurchasedPackage.findById(req.params.id)
            .populate('packageId')
            .populate('photographerId', 'name email profileImage')
            .populate('userId', 'name email')
            .populate('transactionId');

        if (!packageData) {
            return res.status(404).json({
                success: false,
                error: 'Purchased packageData not found'
            });
        }

        res.status(200).json({
            success: true,
            data: packageData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Update purchased packageData status
export const updatePackageStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const packageData = await PurchasedPackage.findById(req.params.id);

        if (!packageData) {
            return res.status(404).json({
                success: false,
                error: 'Purchased packageData not found'
            });
        }

        // Check if the status transition is valid
        const validTransitions = {
            'active': ['completed', 'cancelled'],
            'completed': [],  // completed is final state
            'cancelled': []   // cancelled is final state
        };

        if (!validTransitions[packageData.status].includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot transition from ${packageData.status} to ${status}`
            });
        }

        packageData.status = status;
        await packageData.save();

        res.status(200).json({
            success: true,
            data: packageData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Update delivered photos count
export const updateDeliveredPhotos = async (req, res) => {
    try {
        const { deliveredCount } = req.body;
        const packageData = await PurchasedPackage.findById(req.params.id);

        if (!packageData) {
            return res.status(404).json({
                success: false,
                error: 'Purchased packageData not found'
            });
        }

        if (packageData.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Can only update photos for active packages'
            });
        }

        if (deliveredCount > packageData.photosRemaining) {
            return res.status(400).json({
                success: false,
                error: 'Delivered count exceeds remaining photos'
            });
        }

        packageData.photosDelivered += deliveredCount;
        packageData.photosRemaining -= deliveredCount;

        // Automatically complete packageData if all photos are delivered
        if (packageData.photosRemaining === 0) {
            packageData.status = 'completed';
        }

        await packageData.save();

        res.status(200).json({
            success: true,
            data: packageData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Get photographer's active packages
export const getPhotographerActivePackages = async (req, res) => {
    try {
        const photographerId = req.params.photographerId;
        const packages = await PurchasedPackage.find({ 
            photographerId,
            status: 'active'
        })
        .populate('packageId')
        .populate('userId', 'name email profileImage')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: packages
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Extend packageData expiry date
export const extendPackageExpiry = async (req, res) => {
    try {
        const { extensionDays } = req.body;
        const packageData = await PurchasedPackage.findById(req.params.id);

        if (!packageData) {
            return res.status(404).json({
                success: false,
                error: 'Purchased packageData not found'
            });
        }

        if (packageData.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Can only extend active packages'
            });
        }

        // Maximum extension limit of 30 days
        if (extensionDays > 30) {
            return res.status(400).json({
                success: false,
                error: 'Maximum extension period is 30 days'
            });
        }

        packageData.expiryDate = new Date(packageData.expiryDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);
        await packageData.save();

        res.status(200).json({
            success: true,
            data: packageData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Get packageData statistics for a photographer
export const getPhotographerPackageStats = async (req, res) => {
    try {
        const photographerId = req.params.photographerId;
        
        const stats = await PurchasedPackage.aggregate([
            {
                $match: {
                    photographerId: mongoose.Types.ObjectId(photographerId)
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalPhotosDelivered: { $sum: '$photosDelivered' }
                }
            }
        ]);

        const formattedStats = {
            active: 0,
            completed: 0,
            cancelled: 0,
            totalPhotosDelivered: 0
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
            formattedStats.totalPhotosDelivered += stat.totalPhotosDelivered;
        });

        res.status(200).json({
            success: true,
            data: formattedStats
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};