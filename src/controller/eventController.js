import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { Event } from '../model/events.model.js';
import { User } from '../model/user.model.js';
import s3ServiceWithProgress from '../config/awsS3.config.js';
/*-------------------------------------------Create Event---------------------------------------*/
const createEvent = asyncHandler(async (req, res) => {
  const eventData = req.body;

  // // Validate and ensure photos are in the correct format
  // if (eventData.photos && eventData.photos.length) {
  //   eventData.photos = eventData.photos.map(photoDetail => ({
  //     eventName: photoDetail.eventName,
  //     photos: photoDetail.photos.map(photo => ({
  //       s3Path: photo.s3Path,
  //       size: photo.size,
  //       isSelected: photo.isSelected || false,
  //     })),
  //   }));
  // }

  const newEvent = new Event(eventData);
  await newEvent.save();

  res.status(201).json(new ApiResponse(201, newEvent, "Event created successfully"));
});

/*-------------------------------------------Get Event by ID---------------------------------------*/
const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id).populate('packageId', 'name photoCount price').populate('userId', 'name mobile email').populate('photographerId', 'name mobile email');

  if (!event) {
    throw new ApiError(404, "Couldn't find event!");
  }

  res.status(200).json(new ApiResponse(200, event, "Event details fetched."));
});

/*------------------------------------Get All Events forphotographer---------------------------------------*/
const getEventsPhotographer = asyncHandler(async (req, res) => {
  let user = req.user;
  if (req.params.photographerId) {
    const photographer = await User.findOne({ _id: req.params.photographerId, role: "photographer" });
    if (!photographer) {
      throw new ApiError(404, "Photographer not found!");
    }
    user = photographer;
  }
  const events = await Event.find({ photographerId: user._id }).populate('packageId', 'name photoCount price').populate('userId', 'name mobile email').populate('photographerId', 'name mobile email');;
  if (!events || !events.length) {
    throw new ApiError(404, "No events found.");
  }

  res.status(200).json(new ApiResponse(200, events, "Events fetched successfully"));
});
/*------------------------------------Get All Events user---------------------------------------*/

const getEventsUser = asyncHandler(async (req, res) => {
  let user = req.user;
  if (req.params.userId) {
    const existingUser = await User.findOne({ _id: req.params.userId, role: "user" });
    if (!existingUser) {
      throw new ApiError(404, "user not found!");
    }
    user = existingUser;
  }
  const events = await Event.find({ userId: user._id }).populate('packageId', 'name photoCount price').populate('userId', 'name mobile email').populate('photographerId', 'name mobile email');;
  if (!events || !events.length) {
    throw new ApiError(404, "No events found.");
  }

  res.status(200).json(new ApiResponse(200, events, "Events fetched successfully"));
});
/*-------------------------------------------Update Event---------------------------------------*/
const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Ensure photos are updated in the correct format
  if (req.body.photos && req.body.photos.length) {
    req.body.photos = req.body.photos.map(photoDetail => ({
      eventName: photoDetail.eventName,
      photos: photoDetail.photos.map(photo => ({
        s3Path: photo.s3Path,
        size: photo.size,
        isSelected: photo.isSelected || false,
      })),
    }));
  }

  const updatedEvent = await Event.findByIdAndUpdate(id, req.body, { new: true });
  if (!updatedEvent) {
    throw new ApiError(404, "Couldn't find event!");
  }

  res.status(200).json(new ApiResponse(200, updatedEvent, "Event updated successfully."));
});

/*-------------------------------------------Delete Event---------------------------------------*/
const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findByIdAndDelete(id);

  if (!event) {
    throw new ApiError(404, "Event not found.");
  }

  res.status(200).json(new ApiResponse(200, null, "Event deleted successfully."));
});

/*-------------------------------------------Upload Photos---------------------------------------*/

const uploadPhotos = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No files uploaded");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const uploadedPhotos = [];
  const totalFiles = req.files.length;

  for (const [index, file] of req.files.entries()) {
    const s3Path = `events/${eventId}/${Date.now()}_${file.originalname}`;
    let lastProgress = 0;

    try {
      const s3Service = new s3ServiceWithProgress();

      // Upload file with progress tracking
      const fileUrl = await s3Service.uploadFile(file, s3Path, (progress) => {
        const percentage = Math.round((progress.loaded * 100) / progress.total);

        // Send progress updates only if percentage changes
        if (percentage > lastProgress) {
          lastProgress = percentage;
          res.write(
            `data: ${JSON.stringify({
              file: file.originalname,
              fileIndex: index + 1,
              totalFiles,
              progress: percentage,
            })}\n\n`
          );
        }
      });

      uploadedPhotos.push({
        s3Path: fileUrl.url,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        isSelected: false,
      });

      // Send final progress as 100% for the completed file
      res.write(
        `data: ${JSON.stringify({
          file: file.originalname,
          fileIndex: index + 1,
          totalFiles,
          progress: 100,
        })}\n\n`
      );
    } catch (error) {
      // Send error details through SSE
      res.write(
        `data: ${JSON.stringify({
          error: true,
          file: file.originalname,
          message: error.message,
        })}\n\n`
      );
    }
  }

  // Update event photos in the database
  event.photos.push({ eventName: event.name, photos: uploadedPhotos });
  await event.save();

  // Close the SSE connection
  res.write(`data: ${JSON.stringify({ message: "Upload complete" })}\n\n`);
  res.end();
});

export default uploadPhotos;
export { createEvent, getEventById, getEventsPhotographer, getEventsUser, updateEvent, deleteEvent, uploadPhotos }
