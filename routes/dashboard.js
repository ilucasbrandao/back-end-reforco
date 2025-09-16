import express from "express";
import { getResumoDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/resumo", getResumoDashboard);

export default router;
