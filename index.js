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

import { pool } from "./db.js"; // ou "../db.js" dependendo da estrutura

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

// NÃO USAR app.listen()
// Exporta a função serverless
export default serverless(app);
