import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import fs from "fs"; // Importante para verificar a pasta

// --- Importações Internas ---
import { pool } from "../db.js";
import auth from "../middleware/auth.js";

// --- Rotas ---
import authRoutes from "../routes/auth.js";
import routeAlunos from "../routes/students.js";
import routeProfessores from "../routes/teachers.js";
import feedbackRoutes from "../routes/feedbacks.js";
import routeMensalidade from "../routes/mensalidade.js";
import routeDespesas from "../routes/despesas.js";
import lancamentosRouter from "../routes/lancamentos.js";
import inadiplentesRouter from "../routes/inadimplentes.js";
import fecharCaixa from "../routes/caixa.js";
import resumoDashboard from "../routes/dashboard.js";
import relatorioRoutes from "../routes/relatorio.js";

// =========================================================================
// 1. CONFIGURAÇÕES & CAMINHOS
// =========================================================================
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 DEFINIÇÃO ABSOLUTA DA PASTA DE UPLOADS
const UPLOADS_FOLDER = path.join(__dirname, "uploads");

// Garante que a pasta existe ao iniciar
if (!fs.existsSync(UPLOADS_FOLDER)) {
  fs.mkdirSync(UPLOADS_FOLDER);
  console.log("📁 Pasta 'uploads' criada automaticamente.");
}

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error("⚠️ ERRO: JWT_SECRET não definido no .env");
}

// =========================================================================
// 2. MIDDLEWARES GLOBAIS (A ORDEM IMPORTA!)
// =========================================================================

app.use(
  cors({
    origin: [["http://localhost:5174"], ["https://back-end-reforco-production.up.railway.app/login"]],
    credentials: true,
  })
);

app.use(express.json());

// 🟢 1º: TORNAR A PASTA PÚBLICA (Sem senha, antes de tudo)
// Agora usa a variável UPLOADS_FOLDER para ter certeza absoluta do local
app.use("/uploads", express.static(UPLOADS_FOLDER));

// =========================================================================
// 3. SERVIÇO DE UPLOAD (MULTER)
// =========================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Usa a MESMA variável do express.static
    cb(null, UPLOADS_FOLDER);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s/g, "")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.array("files"), (req, res) => {
  console.log("📥 Recebendo upload...");

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    console.log(
      `✅ ${req.files.length} arquivo(s) salvos em: ${UPLOADS_FOLDER}`
    );

    const fileUrls = req.files.map((file) => {
      // Gera o link público
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    });

    res.json({ urls: fileUrls });
  } catch (error) {
    console.error("❌ Erro upload:", error);
    res.status(500).json({ error: "Falha ao realizar upload." });
  }
});

// =========================================================================
// 4. ROTAS (Protegidas)
// =========================================================================

app.use("/", authRoutes);
app.use("/alunos", routeAlunos);
app.use("/professores", auth, routeProfessores);
app.use("/feedbacks", feedbackRoutes);

// Financeiro
app.use("/receitas", routeMensalidade);
app.use("/despesa", routeDespesas);
app.use("/lancamentos", lancamentosRouter);
app.use("/fechar-caixa-mes", fecharCaixa);
app.use("/", auth, inadiplentesRouter);

// Gestão
app.use("/dashboard", resumoDashboard);
app.use("/", relatorioRoutes);

// =========================================================================
// 5. START
// =========================================================================

app.listen(PORT, () => {
  console.log(`
  ╭──────────────────────────────────────────────────╮
  │   🚀 Servidor rodando: http://localhost:${PORT}    │
  │   📂 Pasta Real:       ${UPLOADS_FOLDER}   │
  ╰──────────────────────────────────────────────────╯
  `);
});
