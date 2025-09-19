import { Router } from "express";
import { LancamentoController } from "../controllers/lancamentos.js";

const router = Router();

router.get("/", LancamentoController.getAll);
router.get("/:id", LancamentoController.getById);
router.post("/", LancamentoController.create);
router.put("/:id", LancamentoController.update);
router.delete("/:id", LancamentoController.delete);

export default router;
