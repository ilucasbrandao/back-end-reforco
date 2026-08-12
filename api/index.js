import "../config/env.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

// --- Importações Internas ---
import auth from "../middleware/auth.js";
import { createUploadMiddleware } from "../middleware/upload.js";
import { UPLOADS_ROOT } from "../config/uploads.js";

// --- Rotas ---
import authRoutes from "../routes/auth.js";
import routeAlunos from "../routes/students.js";
import routeProfessores from "../routes/teachers.js";
import feedbackRoutes from "../routes/feedbacks.js";
import routeMensalidade from "../routes/mensalidade.js";
import routeDespesas from "../routes/despesas.js";
import lancamentosRouter from "../routes/lancamentos.js";
import fecharCaixa from "../routes/caixa.js";
import resumoDashboard from "../routes/dashboard.js";
import relatorioRoutes from "../routes/relatorio.js";
import { createUploadRoutes } from "../routes/upload.js";

// =========================================================================
// 1. CONFIGURAÇÕES
// =========================================================================
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error("⚠️ ERRO: JWT_SECRET não definido no .env");
}

// =========================================================================
// 2. MIDDLEWARES GLOBAIS
// =========================================================================

const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

// 📂 Arquivos estáticos (IMAGENS)
app.use("/uploads", express.static(UPLOADS_ROOT));

// =========================================================================
// 3. ROTAS
// =========================================================================

// Upload genérico (se você ainda usa)
const uploadMiddleware = createUploadMiddleware(UPLOADS_ROOT);
app.use("/upload", createUploadRoutes(uploadMiddleware));

// Autenticação
app.use("/", authRoutes);

// Cadastro
app.use("/alunos", routeAlunos);
app.use("/professores", auth, routeProfessores);

// Feedbacks
app.use("/feedbacks", feedbackRoutes);

// Financeiro
app.use("/receitas", routeMensalidade);
app.use("/despesa", routeDespesas);
app.use("/lancamentos", lancamentosRouter);
app.use("/fechar-caixa-mes", fecharCaixa);

// Gestão
app.use("/dashboard", resumoDashboard);
app.use("/", relatorioRoutes);

// =========================================================================
// 4. ERROS GLOBAIS
// =========================================================================
import multer from "multer";

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === "Apenas imagens são permitidas") {
    return res.status(400).json({ error: err.message });
  }

  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// =========================================================================
// 5. START
// =========================================================================
app.listen(PORT, () => {
  console.log(`
╭──────────────────────────────────────────────────╮
│ 🚀 Servidor rodando: http://localhost:${PORT}     │
│ 📂 Pasta uploads:   ${UPLOADS_ROOT}               │
╰──────────────────────────────────────────────────╯
`);
});
