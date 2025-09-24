import express from "express";
import {
  listarAlunos,
  getAlunoComMovimentacoes,
  cadastrar,
  atualizar,
  deletar,
} from "../controllers/students.js";

const router = express.Router();

//? ROTAS ALUNOS
router.get("/", listarAlunos); // Rota para listar todos os alunos (GET)
router.post("/", cadastrar); // Rota para criar (POST)
router.get("/:id", getAlunoComMovimentacoes); //Rota para listar por ID (GET)
router.put("/:id", atualizar); // Rota para atualizar (PUT)
router.delete("/:id", deletar); // Rota para deletar (DELETE)

export default router;
