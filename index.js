import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import serverless from "serverless-http"; // IMPORTANTE
import routeAlunos from "./routes/students.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Rotas
app.use("/alunos", routeAlunos);

// NÃO USAR app.listen()
// Exporta a função serverless
export const handler = serverless(app);
