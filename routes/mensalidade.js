import express from "express";
import { cadastrarMensalidade } from "../controllers/mensalidade.js";

const router = express.Router();

// Rota para cadastrar mensalidade
router.post("/", cadastrarMensalidade);

export default router;
