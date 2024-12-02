import { User } from "../model/user.model.js";
import mongoose from "mongoose";
import crypto from 'crypto';

/*------------------------------------------to generate tokens-------------------------------------------*/
const createAccessOrRefreshToken = async (user_id) => {
  const user = await User.findById(user_id);
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

/*------------------------------------------to check objectId valid--------------------------------------*/
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*------------------------------------------------generate otp--------------------------------------------*/

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
/*------------------------------------------to send mail-------------------------------------------*/

const sendMail = (receiverEmail, subject, htmlContent) => {
  const options = mailOptions(receiverEmail, subject, htmlContent);
  transporter.sendMail(options, (error, info) => {
    if (error) {
      console.log("Error while sending email:", error);
    } else {
      console.log("Email sent successfully:", info.response);
    }
  });
};

/*------------------------------------------create transaction Id------------------------------------------*/
const generateTransactionId = () => {
  return "TXN_"+crypto.randomBytes(6).toString('hex').toUpperCase();
};

export { createAccessOrRefreshToken, isValidObjectId, generateOTP, sendMail, generateTransactionId }