import express from "express";
import auth from "../middleware/auth.js";
import { validateSchema } from "../middleware/validateSchema.js";
import {
  feedbackCreateSchema,
  feedbackUpdateSchema,
} from "../schemas/feedback.js";
import { FeedbackController } from "../controllers/feedback.js";

// Path
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { UPLOADS_ROOT } from "../config/uploads.js";
import { createUploadMiddleware } from "../middleware/upload.js";

const uploadFeedbackImagens = createUploadMiddleware(
  path.join(__dirname, "../uploads/feedbacks/imagens"),
  {
    allowedMimeTypes: ["image/"],
    maxSizeMB: 5,
    maxFiles: 10,
  }
);

const router = express.Router();

router.use(auth);

// LISTAR
router.get("/aluno/:id", FeedbackController.listarPorAluno);

// CRIAR
router.post(
  "/",
  uploadFeedbackImagens.array("imagens", 10),
  FeedbackController.criar
);

// ATUALIZAR
router.put(
  "/:id",
  validateSchema(feedbackUpdateSchema),
  FeedbackController.atualizar
);

// MARCAR COMO LIDO
router.put("/ler/:id", FeedbackController.marcarComoLido);

// EXCLUIR
router.delete("/:id", FeedbackController.deletar);

export default router;
