import multer from "multer";
import crypto from "crypto";
import path from "path";
import ApiError from "../utils/ApiError.js";

const getUniqueFileName = () =>
  `wedding${crypto.randomBytes(3).toString("hex")}T${Date.now()}`;
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${getUniqueFileName()}-${file.fieldname}${ext}`;
    cb(null, uniqueName);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|webp|png|pdf/;
  const isValid =
    allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
    allowedTypes.test(file.mimetype);

  if (isValid) cb(null, true);
  else cb(new ApiError(400, "", "Only JPG, WEBP, PNG are allowed"));
};

export const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res.status(400).send({ error: "Field doesnt exist" });
  else if (err instanceof ApiError) return next(err);
  next();
};

export const multerUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
});
