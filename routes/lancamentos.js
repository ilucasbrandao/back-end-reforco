import { Router } from "express";
import prisma from "../prisma.js"; // Import centralizado
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

// GET /lancamentos?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    // Filtro de data para Receitas (data_pagamento) e Despesas (data_vencimento ou data_pagamento)
    const filterReceita = {};
    const filterDespesa = {};

    if (inicio || fim) {
      filterReceita.data_pagamento = {};
      filterDespesa.data_pagamento = {}; // Pode ajustar para data_vencimento se preferir

      if (inicio) {
        filterReceita.data_pagamento.gte = new Date(inicio);
        filterDespesa.data_pagamento.gte = new Date(inicio);
      }
      if (fim) {
        filterReceita.data_pagamento.lte = new Date(fim);
        filterDespesa.data_pagamento.lte = new Date(fim);
      }
    }

    // 1️⃣ Buscar Receitas e Despesas em paralelo
    const [receitas, despesas] = await Promise.all([
      prisma.receitas.findMany({
        where: filterReceita,
        include: {
          alunos: { select: { nome: true } },
        },
        orderBy: { data_pagamento: "desc" },
      }),
      prisma.despesas.findMany({
        where: filterDespesa,
        include: {
          professores: { select: { nome: true } },
        },
        orderBy: { data_pagamento: "desc" },
      }),
    ]);

    // 2️⃣ Formatar e Unificar (Transformar tudo no formato "Lancamento")
    const formatados = [
      ...receitas.map((r) => ({
        id: `rec_${r.id}`,
        tipo: "receita",
        descricao: `Mensalidade: ${r.alunos?.nome || "Aluno"}`,
        valor: Number(r.valor),
        status: "Finalizada",
        data: r.data_pagamento
          ? r.data_pagamento.toISOString().split("T")[0]
          : null,
        nome_aluno: r.alunos?.nome || null,
        nome_professor: null,
      })),
      ...despesas.map((d) => ({
        id: `des_${d.id}`,
        tipo: "despesa",
        descricao:
          d.descricao || `Pagamento: ${d.professores?.nome || "Professor"}`,
        valor: Number(d.valor),
        status: "Finalizada",
        data: d.data_pagamento
          ? d.data_pagamento.toISOString().split("T")[0]
          : null,
        nome_aluno: null,
        nome_professor: d.professores?.nome || null,
      })),
    ];

    // Ordenar por data decrescente
    formatados.sort((a, b) => new Date(b.data) - new Date(a.data));

    // 3️⃣ Calcular resumo
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
    res.status(500).json({
      error: "Erro ao buscar lançamentos e resumo",
      details: err.message,
    });
  }
});

export default router;
