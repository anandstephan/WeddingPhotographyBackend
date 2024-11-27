import { createAndStoreOtp } from "../utils/otp.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const sendOtp = asyncHandler(async (req, res) => {
    const { mobile } = req.body;
    if (!mobile) {
        return res.status(400).json(new ApiError(400, null, "Please provide a mobile number"));
    }
    const otp = await createAndStoreOtp(mobile,"mobile");
    console.log("Otp", otp)
    return res.status(200).json(new ApiResponse(200, null, "OTP sent successfully"));
})
export { sendOtp }