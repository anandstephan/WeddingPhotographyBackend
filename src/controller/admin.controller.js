import { User } from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createAccessOrRefreshToken } from "../utils/helper.js";
import { check, validationResult } from "express-validator"

const userValidations = [
  check("name")
    .notEmpty().withMessage("Name is required!")
    .isAlpha().withMessage("Name should contain only alphabetic characters."),
  check("password")
    .notEmpty().withMessage("password is required!"),
  check("email")
    .notEmpty().withMessage("Email is required!")
    .isEmail().withMessage("Email format is invalid."),

  check("mobile")
    .notEmpty().withMessage("Mobile is required!")
    .isMobilePhone("any").withMessage("Mobile format is invalid."),
  check("isEmailVerified")
    .notEmpty().withMessage("isEmailVerified is required!")
    .isBoolean().withMessage("isEmailVerified should be a boolean value (true or false)."),

  check("isMobileVerified")
    .notEmpty().withMessage("isMobileVerified is required!")
    .isBoolean().withMessage("isMobileVerified should be a boolean value (true or false)."),
];
const registerUser = asyncHandler(async (req, res) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(new ApiError(400, "Validation Error", errors));
  }
  const { name, email, mobile, role, isEmailVerified, isMobileVerified, password } = req.body;

  const existedUser = await User.findOne({
    $or: [{ phoneNumber }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with Phone Number already exists");
  }

  const user = await User.create({
    name,
    email,
    mobile,
    role,
    isEmailVerified,
    isMobileVerified,
    password
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
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    throw new ApiError(400, "Identifier (email or mobile) and password are required");
  }

  const user = await User.findOne({
    $or: [{ email: identifier }, { mobile: identifier }]
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await createAccessOrRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { _id } = req.user?._id;
  if (!isValidObjectId(_id)) {
    return res.status(400).json(new ApiError(400, null, "Invalid user ID"));
  }

  const {
    name,
    email,
    isEmailVerified,
  } = req.body;

  const existingUser = await User.findById(_id);
  if (!existingUser)
    return res.status(404).json(new ApiError(404, null, "User not found!"));

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        name,
        email,
        isEmailVerified
      }
    },
    { new: true }
  ).select("-password")
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "user updated successfully"));
})
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1 // this removes the field from document
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_KEY
    )

    const user = await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")

    }
    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await createAccessOrRefreshToken(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body



  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(
      200,
      req.user,
      "User fetched successfully"
    ))
})

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
    const users = await User.find({ role: type });
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

const loginWithMobile = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  if (!mobile) {
    throw new ApiError(400, "Mobile number is required")
  }

  let existingUser = await User.findOne({ mobile }).select("passw");

  const isVerified = await verifyOTP(mobile, otp);
  if (!isVerified) {
    throw new ApiError(400, "Invalid OTP")
  }

  const { accessToken, refreshToken } = await createAccessOrRefreshToken(existingUser._id);
  const loggedInUser = await User.findById(existingUser._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
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
export { registerUser, loginUser, getCurrentUser, loginWithMobile, logoutUser, refreshAccessToken, changeCurrentPassword, createClient, fetchUser, userValidations, updateAccountDetails };
