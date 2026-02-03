import express from "express";
import auth from "../middleware/auth.js";
import { FeedbackController } from "../controllers/feedback.js";
import path from "path";
import { fileURLToPath } from "url";
import { createUploadMiddleware } from "../middleware/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Upload (Pasta corrigida para o padrão que o servidor estático serve)
const uploadFeedbackImagens = createUploadMiddleware(
  path.join(__dirname, "../../uploads/feedbacks/imagens"), // Ajuste de ../.. se necessário
  {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    maxSizeMB: 20,
    maxFiles: 10,
  },
);

const router = express.Router();

// Aplica autenticação em todas as rotas de feedback
router.use(auth);

// --- ROTAS ---

// LISTAR: Busca feedbacks de um aluno (O Controller agora valida se o pai tem acesso)
router.get("/aluno/:id", FeedbackController.listarPorAluno);

// CRIAR: Professor envia relatório com fotos
// DICA: Use o mesmo nome que o Frontend envia no FormData (ex: "imagens")
router.post(
  "/",
  uploadFeedbackImagens.array("imagens", 10),
  FeedbackController.criar,
);

// ATUALIZAR: Permite editar o relatório e adicionar/remover fotos
router.put(
  "/:id",
  uploadFeedbackImagens.array("imagens", 10),
  FeedbackController.atualizar,
);

// MARCAR COMO LIDO: Rota rápida para o App do Pai
router.patch("/ler/:id", FeedbackController.marcarComoLido); // Patch é mais semântico para um update único

// EXCLUIR: Remove o relatório do banco
router.delete("/:id", FeedbackController.deletar);

export default router;
