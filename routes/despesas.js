import express from "express";
import {
  listarDespesa,
  despesaByProfessor,
  despesaByProfessorIdDespesa, // Este agora usa findFirst no Prisma para segurança
  cadastrarDespesa,
  deletarDespesa, // Deleta direto pelo ID da despesa
  atualizarDespesa, // <-- Dica: adicionei isso no Controller anterior, pode usar aqui!
} from "../controllers/despesas.js";

const router = express.Router();

// --- OPERAÇÕES GERAIS ---

// Listar uma despesa específica pelo ID dela
router.get("/:id", listarDespesa);

// Cadastrar nova Despesa
router.post("/", cadastrarDespesa);

// Deletar despesa direto pelo ID (Geral)
router.delete("/:id", deletarDespesa);

// --- OPERAÇÕES VINCULADAS AO PROFESSOR ---

// Buscar todas as despesas de um professor específico
router.get("/professor/:id", despesaByProfessor);

// Buscar uma despesa específica validando o vínculo com o professor
// Útil para garantir que o professor logado só veja o que é dele
router.get("/professor/:professorId/:despesaId", despesaByProfessorIdDespesa);

// Deletar despesa validando o vínculo
//router.delete("/professor/:professorId/:despesaId", deletarDespesaProfessor);

// --- SUGESTÃO: ROTA DE ATUALIZAÇÃO ---
router.patch("/:id", atualizarDespesa);

export default router;
