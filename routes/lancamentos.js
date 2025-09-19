import express from "express";
import {
  listarLancamentos,
  listarLancamentoID,
  cadastrar,
  atualizar,
  deletar,
} from "../controllers/lancamento.js";
const router = express.Router();

router.get("/", listarLancamentos);
router.get("/:id", listarLancamentoID);
router.post("/", cadastrar);
router.put("/:id", atualizar);
router.delete("/:id", deletar);

export default router;
