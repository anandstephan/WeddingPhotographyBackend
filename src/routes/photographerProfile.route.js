import express from 'express';
import { multerUpload, handleMulterErrors } from '../middlewere/multer.middlewere.js';
import { createProfile, getProfilebyId, updateProfile, deleteProfile } from '../controller/photographerProfile.controller.js';
import { createFolderWithPhotos, addPhotosToFolder, deleteFolder, removeImagesFromFolder } from '../controller/photographerProfile.controller.js';

const photographerProfilerouter = express.Router();

photographerProfilerouter.post('/create-profile', createProfile);
photographerProfilerouter.get('/get-profile', getProfilebyId);
photographerProfilerouter.put('/update-profile', updateProfile);
photographerProfilerouter.delete('/delete-profile', deleteProfile);


/*------------------------------------------------portpholio routes------------------------------------------------*/
photographerProfilerouter.post("/create-photos-folder", multerUpload.array("photos", 10), handleMulterErrors, createFolderWithPhotos)
photographerProfilerouter.post("/add-photos", multerUpload.array("photos", 10), addPhotosToFolder)
photographerProfilerouter.delete("/remove-photos", removeImagesFromFolder)
photographerProfilerouter.delete("/delete-folder", deleteFolder)

export default photographerProfilerouter;