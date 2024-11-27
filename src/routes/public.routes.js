import express from 'express';
import { multerUpload } from '../middlewere/multer.middlewere.js';
import { registerUser, loginUser, userValidations, loginWithMobile } from '../controller/admin.controller.js';
import { sendOtp } from '../controller/otp.controller.js';

const router = express.Router();

/*----------------------------------------user api----------------------------------------------------*/
router.post('/signup', multerUpload.single('profileImage'), userValidations, registerUser);
router.post('/login', loginUser);
router.post('/mobile-login', loginWithMobile);

/*--------------------------------------------------otp-----------------------------------------*/

router.post('/send-otp', sendOtp);
export default router;