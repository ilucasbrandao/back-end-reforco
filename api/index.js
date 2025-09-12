// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routeAlunos from "./routes/students.js"; // ajuste se necessário
import { pool } from "./db.js"; // ajuste se necessário

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração CORS: permite apenas seu frontend
app.use(
  cors({
    origin: "https://sistema-escolar-juh.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Permite receber JSON
app.use(express.json());

// Rotas
app.use("/alunos", routeAlunos);

// Rota de teste de conexão com o banco
app.get("/ping", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT 1");
    conn.release();
    res.status(200).send("✅ Conexão com MySQL bem-sucedida!");
  } catch (err) {
    console.error("Erro na conexão:", err.message);
    res.status(500).send("❌ Falha na conexão com o banco de dados.");
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
