//Imports
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routeAlunos from "../routes/students.js";
import { pool } from "../db.js";

//Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  cors({
    origin: ["https://sistema-escolar-juh.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Rotas
app.use("/alunos", routeAlunos);

// Rota de teste de conexão
app.get("/ping", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.query("SELECT 1");
    conn.release();
    res.json({ status: "ok", message: "Conexão com MySQL bem-sucedida!" });
    res.status(200).send("✅ Conexão com MySQL bem-sucedida!");
  } catch (err) {
    console.error("Erro na conexão:", err.message);
    res.status(500).send("❌ Falha na conexão com o banco de dados.");
  }
});

// Porta
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
