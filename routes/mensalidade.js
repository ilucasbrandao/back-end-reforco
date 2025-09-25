import express from "express";
import {
  cadastrarMensalidade,
  deletar,
  listarMensalidade,
  mensalidadeByAluno,
  mensalidadeByAlunoId, // nova função
  deletarMensalidadeAluno, // nova função
} from "../controllers/mensalidade.js";

const router = express.Router();

// Cadastrar nova mensalidade
router.post("/", cadastrarMensalidade);

// Buscar mensalidade por ID da mensalidade
router.get("/:id", listarMensalidade);

// Buscar todas as mensalidades de um aluno pelo ID do aluno
router.get("/aluno/:id", mensalidadeByAluno);

// Buscar uma mensalidade específica de um aluno
router.get("/aluno/:alunoId/:mensalidadeId", mensalidadeByAlunoId);

// Deletar mensalidade por ID
router.delete("/:id", deletar);

// Deletar mensalidade específica de um aluno
router.delete("/aluno/:alunoId/:mensalidadeId", deletarMensalidadeAluno);

export default router;
