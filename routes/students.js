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

// Path
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
import auth from "../middleware/auth.js";
import { createUploadMiddleware } from "../middleware/upload.js";

const uploadFotoAluno = createUploadMiddleware(
  path.join(__dirname, "../uploads/alunos/fotos"),
  {
    allowedMimeTypes: ["image/"],
    maxSizeMB: 5,
    maxFiles: 1,
  }
);

const router = express.Router();

//? ROTAS ALUNOS

//Nova rota
router.get("/meus-filhos", auth, listarMeusFilhos);

router.get("/", listarAlunos); // Rota para listar todos os alunos (GET)
router.post("/", cadastrar); // Rota para criar (POST)
router.patch(
  "/:id/foto",
  auth,
  uploadFotoAluno.single("foto"),
  atualizarFotoAluno
);

router.get("/:id", getAlunoComMovimentacoes); //Rota para listar por ID (GET)
router.put("/:id", atualizar); // Rota para atualizar (PUT)
router.delete("/:id", deletar); // Rota para deletar (DELETE)
export default router;
