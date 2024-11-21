import Events from "../model/events.model";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createEvent = async (req, res) => {
  try {
    const { name } = req.body;

    const event = await Events.create({ name });

    res.status(201).json(new ApiResponse(200, event, "Success"));
  } catch (error) {
    console.error("Error creating event:", error.message);
    res.status(500).json(new ApiError(500, error));
  }
};
