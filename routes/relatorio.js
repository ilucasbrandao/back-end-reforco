import { Router } from "express";
import prisma from "../prisma.js"; // Import centralizado
import auth from "../middleware/auth.js";

const router = Router();

router.get("/relatorio-mensal", auth, async (req, res) => {
  const { mes, ano } = req.query;

  const mesNum = parseInt(mes);
  const anoNum = parseInt(ano);

  // Validação básica
  if (!mes || !ano || isNaN(mesNum) || isNaN(anoNum)) {
    return res.status(400).json({ error: "Mês ou ano inválido" });
  }

  try {
    // Definindo o intervalo de datas para o mês selecionado
    const dataInicio = new Date(anoNum, mesNum - 1, 1);
    const dataFim = new Date(anoNum, mesNum, 1);

    // Executando todas as consultas em paralelo para performance
    const [
      receitas,
      despesas,
      totalAlunos,
      totalProfessores,
      novasMatriculas,
      inadimplentes,
    ] = await Promise.all([
      // 1. Receitas do mês
      prisma.receitas.aggregate({
        where: {
          data_pagamento: { gte: dataInicio, lt: dataFim },
        },
        _sum: { valor: true },
      }),

      // 2. Despesas do mês
      prisma.despesas.aggregate({
        where: {
          data_pagamento: { gte: dataInicio, lt: dataFim },
        },
        _sum: { valor: true },
      }),

      // 3. Total de Alunos Ativos
      prisma.alunos.count({ where: { status: "ativo" } }),

      // 4. Total de Professores Ativos
      prisma.professores.count({ where: { status: "ativo" } }),

      // 5. Novas Matrículas no Mês
      prisma.alunos.count({
        where: {
          data_matricula: { gte: dataInicio, lt: dataFim },
        },
      }),

      // 6. Lista de Inadimplentes (Alunos ativos sem receita no mês/ano)
      prisma.alunos.findMany({
        where: {
          status: "ativo",
          NOT: {
            receitas: {
              some: {
                mes_referencia: mesNum,
                ano_referencia: anoNum,
              },
            },
          },
        },
        select: { id: true, nome: true, valor_mensalidade: true },
      }),
    ]);

    // --- Processamento de Dados ---

    const totalReceitas = Number(receitas._sum.valor || 0);
    const totalDespesas = Number(despesas._sum.valor || 0);

    // Calcula o valor total da inadimplência
    const totalInadimplencia = inadimplentes.reduce((acc, aluno) => {
      return acc + (Number(aluno.valor_mensalidade) || 0);
    }, 0);

    // Resposta formatada para o Frontend
    res.json({
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,

      alunos_status: totalAlunos,
      professores_status: totalProfessores,

      novas_matriculas: novasMatriculas,
      inadimplencia_total: totalInadimplencia,

      inadimplentes: inadimplentes,
    });
  } catch (err) {
    console.error("Erro no Relatório Mensal:", err.message);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

export default router;
