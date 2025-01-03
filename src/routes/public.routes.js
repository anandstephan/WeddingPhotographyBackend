import express from 'express';
import { multerUpload } from '../middlewere/multer.middlewere.js';
import { registerUser, loginUser, userValidations, loginWithMobile } from '../controller/admin.controller.js';
import { sendOtpMobile, verifyMobileOtp, sendOtpEmail, verifyEmailOtp } from '../controller/otp.controller.js';
import { getPhotographerProfile,getPhotographersList } from '../controller/photographerProfile.controller.js';

const router = express.Router();

/*----------------------------------------user api----------------------------------------------------*/
router.post('/signup', multerUpload.single('profileImage'), userValidations, registerUser);
router.post('/login', loginUser);
router.post('/mobile-login', loginWithMobile);

/*-------------------------------------------------------otp--------------------------------------------*/

router.post('/send-mobile-otp', sendOtpMobile);
router.post('/verify-mobile-otp', verifyMobileOtp);
router.post('/send-email-otp', sendOtpEmail);
router.post('/verify-email-otp', verifyEmailOtp);

/*--------------------------------------------------event category-----------------------------------------*/
import { getAllEventCategories,getCategoriesGroupedByType } from '../controller/eventCategory.controller.js';

router.get("/eventCategory/get-list", getAllEventCategories)
router.get("/eventCategory/get-grouped-list", getCategoriesGroupedByType)

/*------------------------------------------------photographer -------------------------------------------*/
router.get("/photographer-profile/:photographerId", getPhotographerProfile)
router.post("/photographer-list", getPhotographersList)

export default router;