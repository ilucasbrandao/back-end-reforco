import express from "express";
import auth from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createProfessorSchema,
  updateProfessorSchema,
} from "../schemas/professorSchema.js";
import {
  listarProfessores,
  listarProfessoresID,
  cadastrarProfessor,
  atualizarProfessor,
  deletarProfessor,
} from "../controllers/teachers.js";

const router = express.Router();

// Aplica autenticação JWT em todas as rotas
router.use(auth);

// --- ROTAS ADMINISTRATIVAS ---
router.get("/", listarProfessores);
router.get("/:id", listarProfessoresID);
router.post("/", validate(createProfessorSchema), cadastrarProfessor);
router.put("/:id", validate(updateProfessorSchema), atualizarProfessor);
router.delete("/:id", deletarProfessor);

export default router;
