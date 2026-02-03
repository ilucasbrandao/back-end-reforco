import express from "express";
import {
  cadastrarMensalidade,
  deletar, // Corresponde ao delete por ID
  listarMensalidade,
  mensalidadeByAluno,
  atualizarMensalidade, // Importação corrigida
  // deletarMensalidadeAluno, // Caso queira manter a exclusão vinculada (veja nota abaixo)
} from "../controllers/mensalidade.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Aplica autenticação em todas as rotas financeiras
router.use(auth);

// --- OPERAÇÕES DE CRIAÇÃO ---
// Cadastrar nova mensalidade (O Controller já verifica duplicidade)
router.post("/", cadastrarMensalidade);

// --- OPERAÇÕES DE LEITURA ---
// Buscar todas as mensalidades de um aluno específico (Para o extrato do pai/admin)
router.get("/aluno/:id", mensalidadeByAluno);

// Buscar uma mensalidade única pelo ID dela
router.get("/:id", listarMensalidade);

// --- OPERAÇÕES DE ATUALIZAÇÃO ---
// Atualizar dados da mensalidade (Valor, data, descrição)
// Ajustado para remover a referência 'mensalidadeController.' que daria erro
router.put("/:id", atualizarMensalidade);

// --- OPERAÇÕES DE EXCLUSÃO ---
// Deletar mensalidade por ID
router.delete("/:id", deletar);

export default router;
