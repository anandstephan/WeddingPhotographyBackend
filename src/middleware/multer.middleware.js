import multer from "multer";

export const multer = () => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/");
    },

    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
    },
  });

  const upload = multer({ storage: storage });

  app.post("/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    res.json({
      message: "File uploaded successfully",
      file: req.file,
    });
  });
};
