import express from "express";
import {
  listarAlunos,
  getAlunoComMovimentacoes,
  cadastrar,
  atualizar,
  deletar,
  listarMeusFilhos,
  atualizarFotoAluno,
} from "../controllers/students.js";

import path from "path";
import { fileURLToPath } from "url";
import auth from "../middleware/auth.js";
import { createUploadMiddleware } from "../middleware/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração de Upload de Foto
const uploadFotoAluno = createUploadMiddleware(
  path.join(__dirname, "../../uploads/alunos/fotos"), // Ajustado caminho se necessário
  {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMB: 5,
    maxFiles: 1,
  },
);

const router = express.Router();

// --- 1. ROTAS FIXAS / ESPECÍFICAS (Sempre no topo) ---

// Rota para o Pai ver apenas os seus dependentes
router.get("/meus-filhos", auth, listarMeusFilhos);

// Listar todos os alunos (Geralmente usada pelo Admin/Professor)
// DICA: Você pode adicionar 'auth' aqui depois para proteger a lista geral
router.get("/", auth, listarAlunos);

// Cadastrar novo aluno
router.post("/", auth, cadastrar);

// --- 2. ROTAS COM PARÂMETROS (:id) ---

// Detalhes do aluno + Mensalidades (O Prisma já traz tudo junto agora)
router.get("/:id", auth, getAlunoComMovimentacoes);

// Atualizar dados cadastrais (Incluindo o novo dia_vencimento)
router.put("/:id", auth, atualizar);

// Rota específica para atualização de foto (Usa PATCH por ser alteração parcial)
router.patch(
  "/:id/foto",
  auth,
  uploadFotoAluno.single("foto"),
  atualizarFotoAluno,
);

// Deletar aluno
router.delete("/:id", auth, deletar);

export default router;
