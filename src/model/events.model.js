import mongoose from "mongoose";

const photoDetailSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage:{
      type: String,
      trim: true,
    },
    photos: {
      type: [
        {
          s3Path: {
            type: String,
            required: true,
            trim: true,
          },
          size: {
            type: String,
            required: true,
          },
          isSelected: {
            type: Boolean,
            default: false,
          },
        },
      ],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Venue name is required"],
      trim: true,
    },
    street: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const eventSchema = new mongoose.Schema(
  {
    photoPackageDetails: {
      type: Object,
      required: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    photographerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    venue: {
      type: venueSchema,
      required: [true, "Venue details are required"],
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "canceled"],
      default: "upcoming",
    },
    photos: {
      type: [photoDetailSchema],
      default: [],
    },
    selected: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Event = mongoose.model("Event", eventSchema);
