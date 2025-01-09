import { User } from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createAccessOrRefreshToken } from "../utils/helper.js";
import { check, validationResult } from "express-validator";
import { verifyOTP } from "../utils/otp.js";
import s3ServiceWithProgress from "../config/awsS3.config.js";

const s3Service = new s3ServiceWithProgress();

const userValidations = [
  check("name").notEmpty().withMessage("Name is required!"),
  check("mobile")
    .notEmpty()
    .withMessage("Mobile is required!")
    .isMobilePhone("any")
    .withMessage("Mobile format is invalid."),
  check("isMobileVerified")
    .notEmpty()
    .withMessage("isMobileVerified is required!")
    .isBoolean()
    .withMessage("isMobileVerified should be a boolean value (true or false)."),
];
const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(new ApiError(400, "Validation Error", errors));
  }

  const {
    name,
    email,
    mobile,
    role,
    isEmailVerified,
    isMobileVerified,
    password,
  } = req.body;

  const query = {
    $or: [{ mobile }],
  };
  if (email) {
    query.$or.push({ email });
  }
  let isActive = true;
  if (role === "photographer") {
    isActive = false;
  }

  const existedUser = await User.findOne(query);
  if (existedUser) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "User already exists!"));
  }

  let avatarUrl = "";
  let s3Path = "";
  try {
    if (req.file) {
      s3Path = `avatars/${Date.now()}_${req.file.originalname}`;
      const fileUrl = await s3Service.uploadFile(req.file, s3Path);
      avatarUrl = fileUrl.url;
    }

    // Create the new user
    const user = await User.create({
      name,
      email,
      mobile,
      role,
      isEmailVerified,
      isMobileVerified,
      isActive,
      password: password || null,
      avatarUrl: avatarUrl,
    });

    const createdUser = await User.findById(user._id).select("-password");
    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    const { accessToken, refreshToken } = await createAccessOrRefreshToken(
      createdUser._id
    );
    const options = {
      httpOnly: true,
      secure: true,
    };
    createdUser.refreshToken = undefined;
    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          201,
          {
            user: createdUser,
            accessToken,
            refreshToken,
          },
          "User registered successfully"
        )
      );
  } catch (error) {
    if (avatarUrl) {
      try {
        await s3Service.deleteFile(avatarUrl);
        console.log("Uploaded avatar deleted due to error:", error.message);
      } catch (deleteError) {
        console.error("Error deleting uploaded avatar:", deleteError.message);
      }
    }
    throw new ApiError(500, error.message);
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    throw new ApiError(
      400,
      "Identifier (email or mobile) and password are required"
    );
  }

  const user = await User.findOne({
    $or: [{ email: identifier }, { mobile: identifier }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  if (!user.isActive) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No Active User Found!"));
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await createAccessOrRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
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

const loginAdmin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    throw new ApiError(
      400,
      "Identifier (email or mobile) and password are required"
    );
  }

  const user = await User.findOne({
    $or: [{ email: identifier }, { mobile: identifier }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await createAccessOrRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
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
        "Admin logged in successfully"
      )
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, email, isEmailVerified, address, isActive } = req.body;

  // Email verification requirement check
  if (email && !isEmailVerified) {
    throw new ApiError(
      400,
      "Email verification is required to update email address"
    );
  }

  // Prepare update fields
  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;
  if (isActive) updateFields.isActive = isActive;

  if (isEmailVerified !== undefined)
    updateFields.isEmailVerified = isEmailVerified;

  // Address handling
  if (address) {
    // Destructure provided address fields
    const { street, city, state, country, pincode, landmark } = address;

    // Check if address exists, update it; otherwise, set new address
    updateFields.address = {
      ...(req.user.address || {}),
      ...(street && { street }),
      ...(city && { city }),
      ...(state && { state }),
      ...(country && { country }),
      ...(pincode && { pincode }),
      ...(landmark && { landmark }),
    };
  }

  // Update the user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_KEY
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } = await createAccessOrRefreshToken(
      user._id
    );

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
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new password are required");
  }
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
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
    throw new ApiError(400, "Mobile number is required");
  }
  let existingUser = await User.findOne({ mobile });
  if (!existingUser.isActive) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No Active User Found!"));
  }
  const isVerified = await verifyOTP(mobile, otp);
  if (!isVerified) {
    throw new ApiError(400, "Invalid OTP");
  }
  const { accessToken, refreshToken } = await createAccessOrRefreshToken(
    existingUser._id
  );
  const loggedInUser = await User.findById(existingUser._id).select(
    "-password -refreshToken"
  );

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

const changeAvatarImage = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!req.file) {
    throw new ApiError(400, "Avatar image is required");
  }

  let avatarUrl;
  const s3Path = `avatars/${Date.now()}_${req.file.originalname}`;
  const fileUrl = await s3Service.uploadFile(req.file, s3Path);
  avatarUrl = fileUrl.url;

  // Delete the previous avatar if it exists
  if (user.avatarUrl) {
    try {
      await s3Service.deleteFile(user.avatarUrl);
    } catch (err) {
      console.error("Error deleting old avatar:", err.message);
      throw new ApiError(500, "Error deleting old avatar image");
    }
  }
  user.avatarUrl = avatarUrl;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
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

const faceIdImageUpload = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!req.file) {
    throw new ApiError(400, "image is required");
  }

  let faceIdImageUrl;
  const s3Path = `faceId/${Date.now()}_${req.file.originalname}`;
  const fileUrl = await s3Service.uploadFile(req.file, s3Path);
  faceIdImageUrl = fileUrl.url;

  // Delete the previous avatar if it exists
  if (user.faceIdImageUrl) {
    try {
      await s3Service.deleteFile(user.faceIdImageUrl);
    } catch (err) {
      console.error("Error deleting old avatar:", err.message);
      throw new ApiError(500, "Error deleting old avatar image");
    }
  }
  user.faceIdImageUrl = faceIdImageUrl;
  await user.save();
  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const removeUser = asyncHandler(async (req, res) => {
  const user = req.user;
  // Deactivate the user
  const deActivateUser = await User.findByIdAndUpdate(
    user._id,
    { isActive: false },
    { new: true }
  );
  if (!deActivateUser) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, null, "User not found or unable to deactivate")
      );
  }
  res
    .status(200)
    .json(new ApiResponse(200, null, "User deactivated successfully"));
});

export {
  registerUser,
  loginUser,
  getCurrentUser,
  loginWithMobile,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  createClient,
  fetchUser,
  userValidations,
  updateAccountDetails,
  loginAdmin,
  changeAvatarImage,
  faceIdImageUpload,
  removeUser,
};
