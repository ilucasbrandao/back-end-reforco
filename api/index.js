import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import lancamentosRoutes from "../routes/lancamentos.js";
import routeAlunos from "../routes/students.js";
import routeProfessores from "../routes/teachers.js";
import routeDashboard from "../routes/dashboard.js";
import { pool } from "../db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: [
      "https://sistema-escolar-juh.vercel.app", // produção
      "http://localhost:5173",
    ], // desenvolvimento
    credentials: true,
  })
);
// Rotas
app.use("/alunos", routeAlunos);
app.use("/professores", routeProfessores);
app.use("/lancamentos", lancamentosRoutes);
app.use("/dashboard", routeDashboard);
app.patch("/lancamentos/:id/baixar", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "UPDATE lancamentos SET status = 'finalizado', data_pagamento = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
