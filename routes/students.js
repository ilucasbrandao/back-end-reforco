import express from "express";
import {
  getStudentsAll,
  getStudentById,
  createStudent,
} from "../controllers/students.js";

const router = express.Router();

router.get("/", getStudentsAll);
router.get("/:id", getStudentById);
router.post("/", createStudent);

export default router;
