import { createAndStoreOtp, verifyOTP } from "../utils/otp.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../model/user.model.js";
/*---------------------------------------mobileOtp------------------------------------------------*/

const sendOtpMobile = asyncHandler(async (req, res) => {
    const { mobile, flag } = req.body;
    console.log(mobile, flag)
    if (flag) {
        console.log("check")
        if (flag === 'signup') {

            const existedUser = await User.findOne({ mobile: mobile.trim() });
            console.log(existedUser)
            if (existedUser) {
                return res.status(200).json(new ApiResponse(200, null, "User already exists!"));
            }
        }
    }
    if (!mobile) {
        return res.status(400).json(new ApiError(400, null, "Please provide a mobile number"));
    }

    const otp = await createAndStoreOtp(mobile, "mobile");
    console.log("Otp", otp)
    return res.status(200).json(new ApiResponse(200, null, "OTP sent successfully"));
})

const verifyMobileOtp = asyncHandler(async (req, res) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
        throw new ApiError(400, "Mobile number and OTP are required")
    }
    const isVerified = await verifyOTP(mobile, otp);
    if (!isVerified) {
        throw new ApiError(400, "Invalid OTP")
    }
    return res.status(200).json(new ApiResponse(200, { isVerified }, "OTP verified successfully"));
})

const sendOtpEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json(new ApiError(400, null, "Please provide a mobile number"));
    }
    const otp = await createAndStoreOtp(email, "email");
    console.log("Otp", otp)
    //write the code here to send otp via email
    return res.status(200).json(new ApiResponse(200, null, "OTP sent successfully"));
})

const verifyEmailOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!mobile || !otp) {
        throw new ApiError(400, "Mobile number and OTP are required")
    }
    const isVerified = await verifyOTP(email, otp);
    if (!isVerified) {
        throw new ApiError(400, "Invalid OTP")
    }
    return res.status(200).json(new ApiResponse(200, isVerified, "OTP verified successfully"));
})
export { sendOtpMobile, verifyMobileOtp, sendOtpEmail, verifyEmailOtp }

