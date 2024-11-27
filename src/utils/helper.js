import { User } from "../model/user.model.js";

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

export { createAccessOrRefreshToken, isValidObjectId, generateOTP }