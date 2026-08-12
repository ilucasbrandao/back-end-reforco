import express from "express";
import path from "path";
import auth from "../middleware/auth.js";
import { StudentController } from "../controllers/students.js";
import { validate } from "../middleware/validate.js";
import { createAlunoSchema } from "../schemas/alunoSchema.js";
import { createUploadMiddleware } from "../middleware/upload.js";
import { UPLOADS_ROOT } from "../config/uploads.js";

// Configuração de Upload para Alunos
// Caminho Final: .../BACKEND/uploads/alunos/fotos
const uploadAlunoFoto = createUploadMiddleware(
  path.join(UPLOADS_ROOT, "alunos/fotos"),
  {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    maxSizeMB: 5,
    maxFiles: 1,
  },
);

const router = express.Router();

// --- ROTAS DE ALUNOS ---

// 1. Meus Filhos (Responsável Logado)
router.get("/meus-filhos", auth, StudentController.listarMeusFilhos);

// 2. Listar Todos os Alunos (Admin/Prof)
router.get("/", auth, StudentController.listarAlunos);

// 3. Cadastrar Aluno (Admin - Autenticado + Validação Zod)
router.post(
  "/",
  auth,
  validate(createAlunoSchema),
  StudentController.cadastrar,
);

// 4. Detalhes do Aluno por ID (Admin/Prof/Responsável)
router.get("/:id", auth, StudentController.getAlunoComMovimentacoes);

// 5. Atualizar Dados do Aluno (Admin - Autenticado + Validação Zod)
router.put(
  "/:id",
  auth,
  validate(createAlunoSchema),
  StudentController.atualizar,
);

// 6. Upload de Foto do Aluno (Responsável/Admin)
router.patch(
  "/:id/foto",
  auth,
  uploadAlunoFoto.single("foto"),
  StudentController.uploadFoto,
);

// 7. Deletar Aluno (Admin)
router.delete("/:id", auth, StudentController.deletar);

export default router;
