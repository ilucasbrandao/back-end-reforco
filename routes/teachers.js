import express from "express";
import auth from "../middleware/auth.js"; // Importando para proteger os dados sensíveis (salários)
import {
  listarProfessores,
  listarProfessoresID,
  cadastrarProfessor,
  atualizarProfessor,
  deletarProfessor,
} from "../controllers/teachers.js";

const router = express.Router();

// Recomendado aplicar o auth para todas as rotas de professores,
// pois contêm dados sensíveis como CPF, Endereço e Salário.
router.use(auth);

// --- LISTAGEM ---
// Listar todos os professores (Geralmente para o Dashboard/Admin)
router.get("/", listarProfessores);

// Buscar um professor específico + suas movimentações financeiras (Prisma include despesas)
router.get("/:id", listarProfessoresID);

// --- AÇÕES ---
// Cadastrar novo professor
router.post("/", cadastrarProfessor);

// Atualizar dados do professor (Salário, Turno, etc.)
router.put("/:id", atualizarProfessor);

// Remover professor do sistema
router.delete("/:id", deletarProfessor);

export default router;
