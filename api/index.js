import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routeAlunos from "../routes/students.js";
import { pool } from "../db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "https://sistema-escolar-juh.vercel.app", // libera apenas essa origem
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
