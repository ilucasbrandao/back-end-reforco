import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routeAlunos from "../routes/students.js";
import routeProfessores from "../routes/teachers.js";
import routeLancamentos from "../routes/lancamentos.js";
import { pool } from "../db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: [
      "https://sistema-escolar-juh.vercel.app", // produção
      "http://localhost:5173", // desenvolvimento
    ],
    credentials: true,
  })
);

// Rotas principais
app.use("/alunos", routeAlunos);
app.use("/professores", routeProfessores);
app.use("/lancamentos", routeLancamentos);

// Rota de teste de conexão
app.get("/ping", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "ok",
      message: "✅ Conexão com PostgreSQL bem-sucedida!",
    });
  } catch (err) {
    console.error("Erro na conexão:", err.message);
    res.status(500).json({
      status: "error",
      message: "❌ Falha na conexão com o banco de dados.",
    });
  }
});

// Porta
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
