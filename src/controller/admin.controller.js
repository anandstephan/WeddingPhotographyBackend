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

export { registerUser };
