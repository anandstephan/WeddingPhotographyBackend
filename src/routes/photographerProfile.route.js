import express from 'express';
import { multerUpload } from '../middlewere/multer.middlewere.js';
import { createProfile,getProfilebyId,updateProfile,deleteProfile } from '../controller/photographerProfile.controller.js';

const photographerProfilerouter = express.Router();

photographerProfilerouter.post('/create-profile', createProfile);
photographerProfilerouter.get('/get-profile', getProfilebyId);
photographerProfilerouter.put('/update-profile', updateProfile);
photographerProfilerouter.delete('/delete-profile', deleteProfile);


export default photographerProfilerouter;