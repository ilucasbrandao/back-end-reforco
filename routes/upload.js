import express from "express";
import auth from "../middleware/auth.js";
import { UploadController } from "../controllers/upload.js";

export function createUploadRoutes(uploadMiddleware) {
  const router = express.Router();

  router.post(
    "/",
    auth,
    uploadMiddleware.array("files", 10),
    UploadController.uploadImages
  );

  return router;
}
