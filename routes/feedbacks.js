import express from "express";
import auth from "../middleware/auth.js";
import { FeedbackController } from "../controllers/feedback.js";

// Path
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createUploadMiddleware } from "../middleware/upload.js";

// Configuração do Upload
const uploadFeedbackImagens = createUploadMiddleware(
  path.join(__dirname, "../uploads/feedbacks/imagens"), 
  {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"], 
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
  uploadFeedbackImagens.array("imagens", 10), 
  FeedbackController.atualizar
);

// MARCAR COMO LIDO
router.put("/ler/:id", FeedbackController.marcarComoLido);

// EXCLUIR
router.delete("/:id", FeedbackController.deletar);

export default router;