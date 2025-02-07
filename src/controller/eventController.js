import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Event } from "../model/events.model.js";
import { User } from "../model/user.model.js";
import s3ServiceWithProgress from "../config/awsS3.config.js";
import { PhotoPackage } from "../model/photoPackage.model.js";
import mongoose from "mongoose";
import slugify from "slugify";
import { check, validationResult } from "express-validator";
import { Transaction } from "../model/transaction.model.js";
import { razorpay } from "../config/razorPayConfig.js";
import { EventShare } from "../model/share.model.js";
import { isValidObjectId } from "../utils/helper.js";

const s3Service = new s3ServiceWithProgress();

const validateCreateEvent = [
  check("packageId").isMongoId().withMessage("Invalid package ID"),
  check("transactionId").isMongoId().withMessage("Invalid transaction ID"),
  check("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Event name is required"),
  check("eventDate").isISO8601().toDate().withMessage("Invalid event date"),
  check("venue.name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Venue name is required"),
  check("venue.street")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Street is required"),
  check("venue.city")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("City is required"),
  check("venue.state")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("State is required"),
  check("venue.postalCode")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Postal code is required"),
  check("venue.country")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Country is required"),
];
/*-------------------------------------------Create Event---------------------------------------*/
const createEvent = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(new ApiError(400, "Validation Error", errors));
  }
  const {
    // razorpay_payment_id,
    packageId,
    transactionId,
    name,
    eventDate,
    venue,
  } = req.body;

  const userId = req.user._id;
  const existingEvent = await Event.findOne({ transaction: transactionId });
  if (existingEvent) {
    throw new ApiError(409, "Transaction is already done with an event");
  }
  // const payment = await razorpay.payments.fetch(razorpay_payment_id);
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Transaction not found"));
  }

  // transaction.transactionId = payment.id;
  // transaction.paymentDetails = payment;
  // transaction.paymentStatus = payment.status;
  // transaction.paymentMethod = payment.method;
  // await transaction.save();
  // Fetch the package details by ID
  const photoPackage = await PhotoPackage.findById(packageId).lean();
  if (!photoPackage) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Photo package not found"));
  }
  const { _id, ...cleanPhotoPackage } = photoPackage;
  // Create slug for the event name
  const slug = slugify(name, { lower: true, strict: true });
  if (new Date(eventDate) < new Date()) {
    throw new ApiError(400, "Event date must be in the future");
  }
  const eventData = {
    photoPackageDetails: cleanPhotoPackage,
    transaction: transactionId,
    userId,
    photographerId: photoPackage.photographerId,
    name: slug,
    eventDate,
    venue,
  };

  // Create and save the event
  const newEvent = new Event(eventData);
  await newEvent.save();

  res
    .status(201)
    .json(new ApiResponse(201, newEvent, "Event created successfully"));
});

/*-------------------------------------------Get Event by ID---------------------------------------*/
const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id)
    .populate("packageId", "name photoCount price")
    .populate("userId", "name mobile email")
    .populate("photographerId", "name mobile email");

  if (!event) {
    throw new ApiError(404, "Couldn't find event!");
  }

  res.status(200).json(new ApiResponse(200, event, "Event details fetched."));
});

/*------------------------------------Get All Events forphotographer---------------------------------------*/
const getEventsPhotographer = asyncHandler(async (req, res) => {
  let user = req.user;
  const { status } = req.query;

  if (req.params.photographerId) {
    const photographer = await User.findOne({
      _id: req.params.photographerId,
      role: "photographer",
    });
    if (!photographer) {
      throw new ApiError(404, "Photographer not found!");
    }
    user = photographer;
  }

  const queryCondition = { photographerId: user._id };
  if (status) {
    queryCondition.status = status;
  }
  const events = await Event.find(queryCondition)
    .populate("packageId", "name photoCount price")
    .populate("userId", "name mobile email")
    .populate("photographerId", "name mobile email");

  if (!events || !events.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], `No ${status || ""} events found!`));
  }

  res
    .status(200)
    .json(new ApiResponse(200, events, "Events fetched successfully"));
});

/*------------------------------------Get All Events user---------------------------------------*/

const getEventsUser = asyncHandler(async (req, res) => {
  let user = req.user;
  const { status } = req.query;
  if (req.params.userId) {
    const existingUser = await User.findOne({
      _id: req.params.userId,
      role: "user",
    });
    if (!existingUser) {
      throw new ApiError(404, "User not found!");
    }
    user = existingUser;
  }

  const queryCondition = { userId: user._id };
  if (status) {
    queryCondition.status = status;
  }
  console.log(queryCondition);
  // Fetch events based on user ID and status
  const events = await Event.find(queryCondition)
    .populate("userId", "name mobile email")
    .populate("photographerId", "name mobile email");

  if (!events || !events.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], `No ${status || ""} Event found!`));
  }

  res
    .status(200)
    .json(new ApiResponse(200, events, "Events fetched successfully"));
});

const getEventsFlatListUser = asyncHandler(async (req, res) => {
  let user = req.user;
  const { status } = req.query;

  if (req.params.userId) {
    const existingUser = await User.findOne({
      _id: req.params.userId,
      role: "user",
    });
    if (!existingUser) {
      throw new ApiError(404, "User not found!");
    }
    user = existingUser;
  }

  const queryCondition = { userId: user._id };
  if (status) {
    queryCondition.status = status;
  }

  const events = await Event.find(queryCondition)
    .populate("photographerId", "name email mobile")
    .select("_id name photographerId eventDate status");

  if (!events || !events.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], `No ${status || ""} Event found!`));
  }

  // Transform the events to a flat structure
  const flatEvents = events.map((event) => ({
    eventId: event._id || null,
    eventName: event.name || null,
    eventDate: event.eventDate || null,
    eventStatus: event.status || null,
    photographerId: event.photographerId?._id || null,
    photographerName: event.photographerId?.name || null,
    photographerEmail: event.photographerId?.email || null,
    photographerMobile: event.photographerId?.mobile || null,
  }));
  res
    .status(200)
    .json(new ApiResponse(200, flatEvents, "Events fetched successfully"));
});

/*-------------------------------------------Update Event---------------------------------------*/
const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Ensure photos are updated in the correct format
  if (req.body.photos && req.body.photos.length) {
    req.body.photos = req.body.photos.map((photoDetail) => ({
      eventName: photoDetail.eventName,
      photos: photoDetail.photos.map((photo) => ({
        s3Path: photo.s3Path,
        size: photo.size,
        isSelected: photo.isSelected || false,
      })),
    }));
  }

  const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!updatedEvent) {
    throw new ApiError(404, "Couldn't find event!");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedEvent, "Event updated successfully."));
});

/*-------------------------------------------Delete Event---------------------------------------*/
const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findByIdAndDelete(id);

  if (!event) {
    throw new ApiError(404, "Event not found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Event deleted successfully."));
});

/*-------------------------------------------Upload Photos---------------------------------------*/

const uploadPhotos = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { eventName } = req.body;
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }
  const eventSlug = slugify(`${eventName}`, { lower: true, strict: true });

  if (!eventName) {
    throw new ApiError(400, "Event name is required");
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No files uploaded");
  }

  const event = await Event.findById(eventId).populate("userId", "mobile");

  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const existingEventWithSameName = event.photos.some(
    (photo) => photo.eventName === eventName
  );
  if (existingEventWithSameName) {
    throw new ApiError(
      400,
      "Event with the same name already exists in photos"
    );
  }
  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const uploadedPhotos = [];
  const totalFiles = req.files.length;

  // Handle premature client disconnection
  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
    console.log("Client disconnected");
    res.end();
  });

  for (const [index, file] of req.files.entries()) {
    if (clientDisconnected) break;

    const s3Path = `${req.user?.mobile}/${event.userId.mobile}/${event.name}/${eventSlug}/${file.originalname}`;
    let lastProgress = 0;
    try {
      const fileUrl = await s3Service.uploadFile(file, s3Path, (progress) => {
        // Send progress updates if client is still connected
        if (!clientDisconnected && progress > lastProgress) {
          lastProgress = progress;
          res.write(
            `data: ${JSON.stringify({
              file: file.originalname,
              fileIndex: index + 1,
              totalFiles,
              progress,
            })}\n\n`
          );
        }
      });

      uploadedPhotos.push({
        s3Path: fileUrl.url,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        isSelected: false,
      });

      // Final progress update
      if (!clientDisconnected) {
        res.write(
          `data: ${JSON.stringify({
            file: file.originalname,
            fileIndex: index + 1,
            totalFiles,
            progress: 100,
          })}\n\n`
        );
      }
    } catch (error) {
      // Notify client about the failure
      if (!clientDisconnected) {
        res.write(
          `data: ${JSON.stringify({
            error: true,
            file: file.originalname,
            message: error.message,
          })}\n\n`
        );
      }
      console.error(`Error uploading ${file.originalname}:`, error.message);
    }
  }

  if (!clientDisconnected) {
    // Update event photos in the database
    event.photos.push({ eventName, photos: uploadedPhotos });
    await event.save();

    // Notify client about completion
    res.write(`data: ${JSON.stringify({ message: "Upload complete" })}\n\n`);
    res.end();
  }
});

/*-------------------------------------------Upload more Photos for existing event--------------------------------------*/
const addMorePhotos = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { eventName } = req.body;

  if (!eventName) {
    throw new ApiError(400, "Event name is required");
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No files uploaded");
  }

  const event = await Event.findById(eventId).populate("userId", "mobile");
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const eventPhotos = event.photos.find(
    (photo) => photo.eventName === eventName
  );
  console.log(eventPhotos);
  if (!eventPhotos) {
    throw new ApiError(
      400,
      `Event with name '${eventName}' not found in photos`
    );
  }
  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const uploadedPhotos = [];
  const totalFiles = req.files.length;

  // Handle premature client disconnection
  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
    console.log("Client disconnected");
    res.end();
  });

  for (const [index, file] of req.files.entries()) {
    if (clientDisconnected) break;

    const s3Path = `${req.user.mobile}/${event.userId.mobile}/${event.name}/${eventName}/${file.originalname}`;
    let lastProgress = 0;
    console.log(s3Path, "s3Path");
    try {
      const fileUrl = await s3Service.uploadFile(file, s3Path, (progress) => {
        // Send progress updates if client is still connected
        if (!clientDisconnected && progress > lastProgress) {
          lastProgress = progress;
          res.write(
            `data: ${JSON.stringify({
              file: file.originalname,
              fileIndex: index + 1,
              totalFiles,
              progress,
            })}\n\n`
          );
        }
      });

      uploadedPhotos.push({
        s3Path: fileUrl.url,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        isSelected: false,
      });

      // Final progress update
      if (!clientDisconnected) {
        res.write(
          `data: ${JSON.stringify({
            file: file.originalname,
            fileIndex: index + 1,
            totalFiles,
            progress: 100,
          })}\n\n`
        );
      }
    } catch (error) {
      // Notify client about the failure
      if (!clientDisconnected) {
        res.write(
          `data: ${JSON.stringify({
            error: true,
            file: file.originalname,
            message: error.message,
          })}\n\n`
        );
      }
      console.error(`Error uploading ${file.originalname}:`, error.message);
    }
  }

  if (!clientDisconnected) {
    // Update event photos in the database
    eventPhotos.photos.push(...uploadedPhotos);
    await event.save();

    // Notify client about completion
    res.write(`data: ${JSON.stringify({ message: "Upload complete" })}\n\n`);
    res.end();
  }
});

const deletePhotos = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { eventName, photoUrls } = req.body;

  if (!eventName) {
    throw new ApiError(400, "Event name is required");
  }

  if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    throw new ApiError(400, "Photo URLs are required and should be an array");
  }

  const event = await Event.findOne({
    _id: eventId,
    "photos.eventName": eventName,
  });

  if (!event) {
    throw new ApiError(
      404,
      "Event not found or no photos exist for this event"
    );
  }

  const eventPhotos = event.photos[0]?.photos || [];

  const photosToDelete = eventPhotos.filter((photo) =>
    photoUrls.includes(photo.s3Path)
  );

  if (photosToDelete.length === 0) {
    throw new ApiError(
      404,
      "No matching photos found to delete for this event"
    );
  }

  console.log(photosToDelete);
  try {
    for (const photo of photosToDelete) {
      await s3Service.deleteFile(photo.s3Path);
    }

    event.photos[0].photos = event.photos[0].photos.filter(
      (photo) => !photoUrls.includes(photo.s3Path)
    );
    await event.save();

    res
      .status(200)
      .json(ApiResponse(200, photosToDelete, "Photos deleted successfully"));
  } catch (error) {
    console.error("Error deleting photos:", error.message);
    throw new ApiError(500, `Error deleting photos: ${error.message}`);
  }
});

/*----------------------------------------------------add selected images------------------------*/

const updateSelectedPhotos = asyncHandler(async (req, res) => {
  const { eventId, imageUrls } = req.body;

  if (!eventId || !Array.isArray(imageUrls)) {
    throw new ApiError(400, "eventId and imageUrls array are required.");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found.");
  }

  // Update `isSelected` to true for provided imageUrls and false for others
  const updatedSelected = [];
  event.photos.forEach((photoDetail) => {
    photoDetail.photos.forEach((photo) => {
      if (imageUrls.includes(photo.s3Path)) {
        photo.isSelected = true;
        if (!updatedSelected.includes(photo.s3Path)) {
          updatedSelected.push(photo.s3Path);
        }
      } else {
        photo.isSelected = false;
      }
    });
  });

  event.selected = updatedSelected;

  await event.save();

  res
    .status(200)
    .json(new ApiResponse(200, event, "selection updated successfully."));
});

const removeSelectedPhotos = async (req, res) => {
  try {
    const { eventId, imageUrls } = req.body;

    if (!eventId || !Array.isArray(imageUrls)) {
      return res.status(400).json({
        message: "eventId and imageUrls array are required.",
      });
    }

    // Find the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    // Remove selection from photos and update selected array
    event.photos.forEach((photoDetail) => {
      photoDetail.photos.forEach((photo) => {
        if (imageUrls.includes(photo.s3Path)) {
          photo.isSelected = false;
          const index = event.selected.indexOf(photo.s3Path);
          if (index !== -1) {
            event.selected.splice(index, 1);
          }
        }
      });
    });

    // Save the updated event
    await event.save();

    res.status(200).json({
      message: "Photos selection removed successfully.",
      event,
    });
  } catch (error) {
    console.error("Error removing selected photos:", error);
    res.status(500).json({
      message: "An error occurred while removing selected photos.",
      error: error.message,
    });
  }
};

const getSelectedPhotos = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({
      message: "eventId is required.",
    });
  }

  const event = await Event.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(eventId) } },
    {
      $project: {
        _id: 1, // Include event ID in the result
        selectedPhotos: {
          $filter: {
            input: {
              $reduce: {
                input: "$photos", // Access the 'photos' array in the event
                initialValue: [],
                in: {
                  $concatArrays: [
                    "$$value",
                    {
                      $filter: {
                        input: "$$this.photos", // Access each photo's 'photos' array
                        as: "photo",
                        cond: { $eq: ["$$photo.isSelected", true] }, // Filter photos where isSelected is true
                      },
                    },
                  ],
                },
              },
            },
            as: "photo",
            cond: { $eq: ["$$photo.isSelected", true] }, // Ensure photos are selected
          },
        },
      },
    },
  ]);

  if (!event || event.length === 0) {
    return res.status(404).json({
      message: "Event not found or no selected photos.",
    });
  }

  res.status(200).json({
    message: "Selected photos retrieved successfully.",
    selectedPhotos: event[0].selectedPhotos, // Return the filtered selected photos
  });
});

/* shared  function   (took mobile numbder and push it  to the  array) */

const shareEvent = asyncHandler(async (req, res) => {
  const { mobile, eventId } = req.body;
  if(!mobile){
    throw new ApiError(400, "mobile number is required");
  }
  if(!isValidObjectId(eventId)){
    throw new ApiError(400, "Invalid eventId");
  }
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found!");
  }
  if (event.userId != req.user.id) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "only root user can share the event"));
  }
  const alreadyShared = await EventShare.findOne({ mobile, eventId });
  if (alreadyShared) {
    throw new ApiError(
      400,
      "You have already shared this event with this mobile number"
    );
  }
  const newEventShare = new EventShare({
    eventId,
    mobile,
  });
  await newEventShare.save();
  res
    .status(200)
    .json(new ApiResponse(200, newEventShare, "Event shared successfully"));
});

export {
  createEvent,
  getEventById,
  getEventsPhotographer,
  getEventsUser,
  updateEvent,
  deleteEvent,
  uploadPhotos,
  addMorePhotos,
  deletePhotos,
  updateSelectedPhotos,
  removeSelectedPhotos,
  getSelectedPhotos,
  validateCreateEvent,
  getEventsFlatListUser,
  shareEvent,
};
