import express from "express";
import auth from "../middleware/auth.js";
import { StudentController } from "../controllers/students.js";
import path from "path";
import { createUploadMiddleware } from "../middleware/upload.js";
import { UPLOADS_ROOT } from "../config/uploads.js"; // Importação crucial

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

// Aplica autenticação em todas as rotas (Opcional, mas recomendado)
// Se quiser deixar listarAlunos público, mova o auth apenas para as rotas específicas
// router.use(auth);

// --- ROTAS ---

// 1. Meus Filhos (Responsável)
router.get("/meus-filhos", auth, StudentController.listarMeusFilhos);

// 2. Listar Todos (Admin/Prof)
router.get("/", auth, StudentController.listarAlunos);

// 3. Cadastrar (Admin)
router.post("/", auth, StudentController.cadastrar);

// 4. Detalhes (Admin/Prof/Responsável - validação interna no controller idealmente)
router.get("/:id", auth, StudentController.getAlunoComMovimentacoes);

// 5. Atualizar Dados (Admin)
router.put("/:id", auth, StudentController.atualizar);

// 6. Upload de Foto (Responsável/Admin)
router.patch(
  "/:id/foto",
  auth,
  uploadAlunoFoto.single("foto"), // Middleware do Multer processa o arquivo
  StudentController.uploadFoto, // Controller salva a URL no banco
);

// 7. Deletar (Admin)
router.delete("/:id", auth, StudentController.deletar);

export default router;
