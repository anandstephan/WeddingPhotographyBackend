import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createAccessOrRefreshToken } from "../utils/helper.js";

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
    console.log("==", req.body);
    if ([phoneNumber, OTP].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "Phone number and OTP are required");
    }

    const user = await User.findOne({ phoneNumber });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!user.isVerified) {
      throw new ApiError(403, "User is not verified yet");
    }

    if (user.OTP !== OTP) {
      throw new ApiError(401, "Invalid OTP");
    }

    let { accessToken, refreshToken } = await createAccessOrRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      // maxAge: 24 * 60 * 60 * 1000, // 1 day/
    };

    const LoggedInUser = await User.findById(user._id).select("-password");

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: LoggedInUser,
          },
          "User logged in successfully"
        )
      );
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Something went wrong while logging in",
    });
  }
});

const fetchUser = asyncHandler(async (req, res) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a user type in the query parameter (e.g., ?type=admin).",
      });
    }

    if (!["admin", "photographer", "user"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid user type. Allowed values are 'admin', 'photographer', 'user'.`,
      });
    }

    const users = await User.find({ userType: type });

    return res
      .status(200)
      .json(new ApiResponse(200, users, "User Fetch Successfully"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, error, "Internal server error"));
  }
});

const createClient = asyncHandler(async (req, res) => {
  try {
    const [number] = req.body;

    const photographer = await findOne(number);

    if (!photographer) {
      throw new ApiError(
        404,
        "User not found. Check the number you have entered"
      );
    }

    const { id, phoneNumber } = photographer;

    return res
      .status(200)
      .json(new ApiResponse(200, { id }, "Photographer found"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});
export { registerUser, loginUser, createClient, fetchUser };
