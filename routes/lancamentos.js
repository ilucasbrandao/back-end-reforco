import { Router } from "express";
import prisma from "../prisma.js"; // Import centralizado
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

// GET /lancamentos?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    // Filtro de data flexível
    const whereClause = {};
    if (inicio || fim) {
      whereClause.data = {};
      if (inicio) whereClause.data.gte = new Date(inicio);
      if (fim) whereClause.data.lte = new Date(fim);
    }

    // 1️⃣ Buscar lançamentos com suas relações
    const lancamentos = await prisma.lancamentos.findMany({
      where: whereClause,
      include: {
        alunos: {
          select: { nome: true },
        },
        professores: {
          select: { nome: true },
        },
        receitas: {
          select: { data_pagamento: true, valor: true },
        },
      },
      orderBy: {
        data: "desc",
      },
    });

    // 2️⃣ Formatar os dados para manter a compatibilidade com o seu Frontend
    const formatados = lancamentos.map((l) => {
      // Prioriza a data de pagamento da receita se existir, senão usa a data do lançamento
      const dataFinal = l.receitas?.data_pagamento
        ? l.receitas.data_pagamento.toISOString().split("T")[0]
        : l.data.toISOString().split("T")[0];

      return {
        lancamento_id: l.lancamento_id,
        tipo: l.tipo,
        origem_id: l.origem_id,
        descricao: l.descricao,
        valor: Number(l.valor),
        status: "Finalizada",
        data: dataFinal,
        nome_aluno: l.alunos?.nome || null,
        nome_professor: l.professores?.nome || null,
      };
    });

    // 3️⃣ Calcular resumo (Total de Receitas, Despesas e Saldo)
    const resumo = formatados.reduce(
      (acc, curr) => {
        if (curr.tipo === "receita") {
          acc.total_receitas += curr.valor;
          acc.saldo += curr.valor;
        } else {
          acc.total_despesas += curr.valor;
          acc.saldo -= curr.valor;
        }
        return acc;
      },
      { total_receitas: 0, total_despesas: 0, saldo: 0 },
    );

    res.json({
      lancamentos: formatados,
      resumo: resumo,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar lançamentos e resumo:", err.message);
    res.status(500).json({ error: "Erro ao buscar lançamentos e resumo" });
  }
});

export default router;
