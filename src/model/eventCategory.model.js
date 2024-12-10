import mongoose from 'mongoose';

const eventCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    imageUrl: {
        type: String,
    },
    type: {
        type: String,
        enum: ['wedding', 'engagement', 'anniversary', 'events', 'birthday', 'other'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export const EventCategory = mongoose.model('EventCategory', eventCategorySchema);

