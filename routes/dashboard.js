import express from "express";
import { getResumoDashboard } from "../controllers/dashboard.js";

const router = express.Router();
router.get("/resumo", getResumoDashboard); // ✅ rota correta
export default router;
