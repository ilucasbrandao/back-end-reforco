import express from "express";
import {
  listarDespesa,
  despesaByProfessor,
  despesaByProfessorId,
  cadastrarDespesa,
  deletarDespesa,
  deletarDespesaProfessor,
} from "../controllers/despesas.js";

const router = express.Router();

// Cadastrar nova Despesa
router.post("/", cadastrarDespesa);

// Buscar despesa por ID da despesa
router.get("/:id", listarDespesa);

// Buscar todas as despesas de um professor pelo ID do professor
router.get("/professor/:id", despesaByProfessor);

// Buscar uma despesa específica de um professor
router.get("/professor/:professorId/:despesaId", despesaByProfessorId);

// Deletar despesa específica de um professor
router.delete("/professor/:professorId/:despesaId", deletarDespesaProfessor);

export default router;
