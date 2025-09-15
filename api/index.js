// Imports
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routeAlunos from "../routes/students.js";
import { pool } from "../db.js";

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// Configuração CORS
const allowedOrigins = [
  "https://sistema-escolar-juh.vercel.app", // produção (Vercel)
  "http://localhost:5173", // desenvolvimento (Vite)
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Suporte ao preflight (OPTIONS)
app.options("*", cors());

// Rotas
app.use("/alunos", routeAlunos);

// Rota de teste de conexão
app.get("/ping", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res
      .status(200)
      .json({ status: "ok", message: "✅ Conexão com MySQL bem-sucedida!" });
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
