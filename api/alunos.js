import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import serverless from "serverless-http";
import routeAlunos from "../routes/students.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Usar "/" para evitar /api/alunos/alunos
app.use("/", routeAlunos);

export const handler = serverless(app);
