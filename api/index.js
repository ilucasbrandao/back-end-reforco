import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routeAlunos from "../routes/students.js";
import routeProfessores from "../routes/teachers.js";
import routeMensalidade from "../routes/mensalidade.js";
import routeDespesas from "../routes/despesas.js";
import lancamentosRouter from "../routes/lancamentos.js";
import resumoDashboard from "../routes/dashboard.js";
import fecharCaixa from "../routes/caixa.js";
import relatorioRoutes from "../routes/relatorio.js";
import inadiplentesRouter from "../routes/inadimplentes.js";
import { pool } from "../db.js";
import auth from "../middleware/auth.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  throw new Error("⚠️ JWT_SECRET não definido");
}

const JWT_SECRET = process.env.JWT_SECRET;

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
app.use("/professores", auth, routeProfessores);
app.use("/receitas", routeMensalidade);
app.use("/despesa", routeDespesas);
app.use("/lancamentos", lancamentosRouter);
app.use("/dashboard", resumoDashboard);
app.use("/fechar-caixa-mes", fecharCaixa);
app.use("/", relatorioRoutes);
app.use("/", auth, inadiplentesRouter);

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
