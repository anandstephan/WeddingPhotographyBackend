import mongoose from 'mongoose';

const portfolioItemSchema = new mongoose.Schema({
    folderName: { type: String, required: true },
    photos: [{ type: String }],
  }, { _id: false });
  
  const photographerProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    bio: String,
    specializations: [String],
    portfolio: [portfolioItemSchema],
    storageUsed: { type: Number, default: 0 }, // in GB
    packageStartDate: Date,
    packageEndDate: Date,
    // rating: { type: Number, default: 0 },
    // reviewCount: { type: Number, default: 0 },
  }, { timestamps: true });
  
  export const PhotographerProfile = mongoose.model('PhotographerProfile', photographerProfileSchema);
  