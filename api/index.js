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

// Configuração CORS global
const allowedOrigins = [
  "https://sistema-escolar-juh.vercel.app",
  "https://sistema-escolar-git-main-ilucasbrandaos-projects.vercel.app",
  "https://sistema-escolar-hnpllebk7-ilucasbrandaos-projects.vercel.app",
  "http://localhost:5173", // para desenvolvimento local
];

app.use(
  cors({
    origin: function (origin, callback) {
      // permite requisições sem origin (ex: Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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
