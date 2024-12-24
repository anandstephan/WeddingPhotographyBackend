import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Event } from "../model/events.model.js";
import { User } from "../model/user.model.js";
import s3ServiceWithProgress from "../config/awsS3.config.js";
import slugify from "slugify";

const s3Service = new s3ServiceWithProgress();
/*-------------------------------------------Create Event---------------------------------------*/
const createEvent = asyncHandler(async (req, res) => {
  const eventData = req.body;

  const slug = slugify(eventData.name, { lower: true, strict: true });
  eventData.name = slug;
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
  const events = await Event.find({ photographerId: user._id })
    .populate("packageId", "name photoCount price")
    .populate("userId", "name mobile email")
    .populate("photographerId", "name mobile email");
  if (!events || !events.length) {
    throw new ApiError(404, "No events found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, events, "Events fetched successfully"));
});
/*------------------------------------Get All Events user---------------------------------------*/

const getEventsUser = asyncHandler(async (req, res) => {
  let user = req.user;
  if (req.params.userId) {
    const existingUser = await User.findOne({
      _id: req.params.userId,
      role: "user",
    });
    if (!existingUser) {
      throw new ApiError(404, "user not found!");
    }
    user = existingUser;
  }
  const events = await Event.find({ userId: user._id })
    .populate("packageId", "name photoCount price")
    .populate("userId", "name mobile email")
    .populate("photographerId", "name mobile email");
  if (!events || !events.length) {
    throw new ApiError(404, "No events found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, events, "Events fetched successfully"));
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

const updateSelectedPhotos = async (req, res) => {
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

    // Update the isSelected field and build the selected array
    event.photos.forEach((photoDetail) => {
      photoDetail.photos.forEach((photo) => {
        if (imageUrls.includes(photo.s3Path)) {
          photo.isSelected = true;
          if (!event.selected.includes(photo.s3Path)) {
            event.selected.push(photo.s3Path);
          }
        }
      });
    });

    // Save the updated event
    await event.save();

    res.status(200).json({
      message: "Photos updated successfully.",
      event,
    });
  } catch (error) {
    console.error("Error updating photos:", error);
    res.status(500).json({
      message: "An error occurred while updating photos.",
      error: error.message,
    });
  }
};

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
};
