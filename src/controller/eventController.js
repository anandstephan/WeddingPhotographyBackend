import Events from "../model/events.model";

export const createEvent = async (req, res) => {
  try {
    const { name } = req.body;

    const event = await Events.create({ name });

    res.status(201).json({
      success: true,
      data: event,
    });
    
  } catch (error) {
    console.error("Error creating event:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
