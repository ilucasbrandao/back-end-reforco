import express from "express";
import {
  cadastrarMensalidade,
  deletar,
  listarMensalidade,
  mensalidadeByAluno,
  mensalidadeByAlunoId,
  deletarMensalidadeAluno,
} from "../controllers/mensalidade.js";

const router = express.Router();

// Cadastrar nova mensalidade
router.post("/", cadastrarMensalidade);

// Buscar todas as mensalidades de um aluno
router.get("/aluno/:id", mensalidadeByAluno);

// Buscar uma mensalidade específica de um aluno
router.get("/aluno/:alunoId/:receitaId", mensalidadeByAlunoId);

// Buscar mensalidade por ID da mensalidade
router.get("/:id", listarMensalidade);

// Deletar mensalidade específica de um aluno
router.delete("/aluno/:alunoId/:receitaId", deletarMensalidadeAluno);

// Deletar mensalidade por ID
router.delete("/:id", deletar);

export default router;
