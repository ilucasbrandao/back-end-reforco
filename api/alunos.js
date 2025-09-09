import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import serverless from "serverless-http";
import routeAlunos from "../routes/students.js"; // 👈 sobe um nível
import { pool } from "../db.js"; // 👈 sobe um nível

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/alunos", routeAlunos);

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

export default serverless(app);
