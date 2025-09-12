import express from "express";

import {
  getStudentsAll,
  getStudentById,
  cadastrar,
} from "../controllers/students.js";

const router = express.Router();

router.get("/", getStudentsAll);
router.get("/:id", getStudentById);
router.post("/", cadastrar);

export default router;
