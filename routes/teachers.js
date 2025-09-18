import express from "express";
import {
  listarProfessores,
  listarProfessoresID,
  cadastrarProfessor,
  atualizarProfessor,
  deletarProfessor,
} from "../controllers/teachers.js";

const router = express.Router();

router.get("/", listarProfessores);
router.post("/", cadastrarProfessor);
router.get("/:id", listarProfessoresID);
router.put("/:id", atualizarProfessor);
router.delete("/:id", deletarProfessor);

export default router;
