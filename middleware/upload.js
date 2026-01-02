import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

export function createUploadMiddleware(UPLOADS_FOLDER, options = {}) {
  const {
    allowedMimeTypes = ["image/"],
    maxSizeMB = 2,
    maxFiles = 10,
  } = options;

  // ✅ GARANTE QUE A PASTA EXISTE (CRÍTICO)
  if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = crypto.randomBytes(16).toString("hex");
      cb(null, `${name}${ext}`);
    },
  });

  function fileFilter(req, file, cb) {
    const isAllowed = allowedMimeTypes.some((type) =>
      file.mimetype.startsWith(type)
    );

    if (!isAllowed) {
      return cb(new Error("Apenas imagens são permitidas"));
    }

    cb(null, true);
  }

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
      files: maxFiles,
    },
  });
}
