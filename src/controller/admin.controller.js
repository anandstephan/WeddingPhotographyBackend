import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { name, phoneNumber, userType } = req.body;

    if ([name, phoneNumber, userType].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "All fields are required");
    }
    const existedUser = await User.findOne({
      phoneNumber,
    });
    if (existedUser) {
      throw new ApiError(409, "User with Phone Number already exists");
    }

    const user = await User.create({
      name,
      phoneNumber,
      userType,
    });

    const createdUser = await User.findById(user._id);

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered Successfully"));
  } catch (error) {
    console.log("Error", error);
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { phoneNumber, OTP } = req.body;

    if ([phoneNumber, OTP].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "Phone number and OTP are required");
    }

    // Find the user by phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Check if the user has been verified or not
    if (!user.isVerified) {
      throw new ApiError(403, "User is not verified yet");
    }

    // Verify OTP (Here, we assume OTP is still '1234' by default; you can modify this to verify dynamically)
    if (user.OTP !== OTP) {
      throw new ApiError(401, "Invalid OTP");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User logged in successfully"));
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Something went wrong while logging in",
    });
  }
});

export { registerUser, loginUser };
