import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { Event } from '../model/events.model.js';


// Configure AWS S3
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const bucketName = process.env.AWS_BUCKET_NAME;

/*-------------------------------------------create Event---------------------------------------*/

const createEvent = asyncHandler(async (req, res) => {
  const eventData = req.body;
  const newEvent = new Event(eventData);
  await newEvent.save();
  res.status(201).json(new ApiResponse(201, newEvent, "Event created successfully"));
})

/*-------------------------------------------get event by Id---------------------------------------*/
const getEventById = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const event = await Event.findById(id).populate('packageId userId photographerId')
  if (!event) {
    throw new ApiError(404, "Couldn't find event!")
  }
  res.status(200).json(new ApiResponse(200, event, "Event details Fatched."));
})

/*-------------------------------------------get all events---------------------------------------*/
const getEvents = asyncHandler(async (req, res) => {
  const user = req.user;
  const events = await Event.find({ photographerId: user._id }).populate('packageId userId photographerId');

  if (!events) {
    throw new ApiError(404, "No events found");
  }
  res.status(200).json(new ApiResponse(200, events, "Event fatched successfully"));
})

/*-------------------------------------------update event---------------------------------------*/

const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedEvent = await Event.findByIdAndUpdate(id, req.body, { new: true });
  if (!updatedEvent) {
    throw new ApiError(404, "Couldn't find event!")
  }
  res.status(200).json(new ApiResponse(200, updatedEvent, "Event details Fatched."));

})

// Delete Event
const deleteEvent = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const event = await Event.findByIdAndDelete(id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.status(200).json({ message: "Event deleted successfully" });
})

// Upload Photos to S3
export const uploadPhotos = async (req, res) => {
  try {
    const { id } = req.params; // Event ID
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedPhotos = [];
    for (const file of req.files) {
      const params = {
        Bucket: bucketName,
        Key: `events/${id}/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Change according to your bucket's policy
      };

      const uploadResult = await s3.upload(params).promise();
      uploadedPhotos.push({ s3Path: uploadResult.Location });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.photos.push(...uploadedPhotos);
    await event.save();

    res.status(200).json({ message: "Photos uploaded successfully", photos: uploadedPhotos });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload photos", error: error.message });
  }
};

export { createEvent, getEventById, getEvents, updateEvent, deleteEvent }