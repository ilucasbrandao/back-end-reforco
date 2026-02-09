import express from "express";
import auth from "../middleware/auth.js";
import { FeedbackController } from "../controllers/feedback.js";
import path from "path";
import { createUploadMiddleware } from "../middleware/upload.js";

import { UPLOADS_ROOT } from "../config/uploads.js";

const uploadFeedbackImagens = createUploadMiddleware(
  path.join(UPLOADS_ROOT, "feedbacks/imagens"),
  {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    maxSizeMB: 20,
    maxFiles: 10,
  },
);

const router = express.Router();

router.use(auth);

// LISTAR
router.get("/aluno/:id", FeedbackController.listarPorAluno);

// CRIAR
router.post(
  "/",
  uploadFeedbackImagens.array("imagens", 10),
  FeedbackController.criar,
);

// ATUALIZAR
router.put(
  "/:id",
  uploadFeedbackImagens.array("imagens", 10),
  FeedbackController.atualizar,
);

// MARCAR COMO LIDO
router.patch("/ler/:id", FeedbackController.marcarComoLido);

// EXCLUIR
router.delete("/:id", FeedbackController.deletar);

export default router;
