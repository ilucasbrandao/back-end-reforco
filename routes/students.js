import express from "express";
import {
  listarAlunos,
  listarAlunosID,
  cadastrar,
} from "../controllers/students.js";

const router = express.Router();

router.get("/", listarAlunos);
router.get("/:id", listarAlunosID);
router.post("/", cadastrar);

export default router;
