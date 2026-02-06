import { Router } from "express";
import prisma from "../prisma.js"; // Import centralizado
import auth from "../middleware/auth.js";
import { da } from "zod/locales";

const router = Router();
router.use(auth);

router.get("/", async (req, res) => {
  try {
    const hoje = new Date();
    let { mes, ano } = req.query;

    const mesNum =
      !mes || mes === "undefined" ? hoje.getMonth() + 1 : Number(mes);
    const anoNum =
      !ano || ano === "undefined" ? hoje.getFullYear() : Number(ano);

    // Intervalo de datas para cálculos baseados em data (Matrículas e Aniversários)
    const dataInicio = new Date(anoNum, mesNum - 1, 1);
    const dataFim = new Date(anoNum, mesNum, 1);

    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Aluno só é cobrado se tiver pelo menos 1 mês de casa (evita cobrar aluno novo)
    const dataCorte = new Date(anoNum, mesNum - 1, hoje);
    const ehMesAtual = mesNum === mesAtual && anoNum === anoAtual;

    // --- EXECUÇÃO EM PARALELO ---
    const [
      alunosAtivos,
      professoresAtivos,
      turnoGroup,
      receitasMes,
      despesasMes,
      alunosAniv,
      professoresAniv,
      previstoMensalidades,
      previstoSalarios,
      matriculadosMes,
      candidatosInadimplentes, // Busca dos inadimplentes com inteligência de vencimento
    ] = await Promise.all([
      // 1. Alunos Ativos
      prisma.alunos.count({ where: { status: "ativo" } }),

      // 2. Professores Ativos
      prisma.professores.count({ where: { status: "ativo" } }),

      // 3. Alunos por Turno
      prisma.alunos.groupBy({
        by: ["turno"],
        where: { status: "ativo" },
        _count: true,
      }),

      // 4a. Receitas do Período
      prisma.receitas.findMany({
        where: { mes_referencia: mesNum, ano_referencia: anoNum },
        select: { valor: true },
      }),

      // 4b. Despesas do Período
      prisma.despesas.findMany({
        where: { mes_referencia: mesNum, ano_referencia: anoNum },
        select: { valor: true },
      }),

      // 5. Aniversariantes Alunos
      prisma.$queryRaw`SELECT nome, data_nascimento FROM alunos WHERE EXTRACT(MONTH FROM data_nascimento) = ${mesNum} AND status = 'ativo' ORDER BY EXTRACT(DAY FROM data_nascimento)`,

      // 6. Aniversariantes Professores
      prisma.$queryRaw`SELECT nome, data_nascimento FROM professores WHERE EXTRACT(MONTH FROM data_nascimento) = ${mesNum} AND status = 'ativo' ORDER BY EXTRACT(DAY FROM data_nascimento)`,

      // 7. Saldo Previsto Mensalidades
      prisma.alunos.aggregate({
        where: { status: "ativo" },
        _sum: { valor_mensalidade: true },
      }),

      // 8. Saldo Previsto Salários
      prisma.professores.aggregate({
        where: { status: "ativo" },
        _sum: { salario: true },
      }),

      // 9. Matriculados no Mês
      prisma.alunos.count({
        where: {
          status: "ativo",
          data_matricula: { gte: dataInicio, lt: dataFim },
        },
      }),

      // 10. Inadimplentes com Inteligência de Vencimento
      prisma.alunos.findMany({
        where: {
          status: "ativo",
          data_matricula: { lt: dataCorte },
          NOT: {
            receitas: {
              some: { mes_referencia: mesNum, ano_referencia: anoNum },
            },
          },
        },
        select: {
          id: true,
          nome: true,
          valor_mensalidade: true,
          telefone: true,
          dia_vencimento: true,
        },
      }),
    ]);

    // --- PROCESSAMENTO DOS RESULTADOS ---

    // Turnos
    const alunos_por_turno = {};
    turnoGroup.forEach((tg) => {
      alunos_por_turno[tg.turno || "N/A"] = tg._count;
    });

    // Cálculo do Saldo Real de Caixa (Receitas - Despesas)
    const totalReceitas = receitasMes.reduce(
      (acc, curr) => acc + Number(curr.valor),
      0,
    );
    const totalDespesas = despesasMes.reduce(
      (acc, curr) => acc + Number(curr.valor),
      0,
    );
    const saldo_caixa = totalReceitas - totalDespesas;

    // Inadimplentes com Inteligência de Vencimento
    const inadimplentes = candidatosInadimplentes.filter((aluno) => {
      if (!ehMesAtual) return true;

      const vencimento = Number(aluno.dia_vencimento);
      return vencimento < diaAtual;
    });

    res.json({
      alunos_ativos: alunosAtivos,
      professores_ativos: professoresAtivos, // Corrigido nome da variável
      alunos_por_turno,
      saldo_caixa,
      aniversariantes: alunosAniv,
      professoresAniversariantes: professoresAniv,
      saldo_previsto_mensalidades: Number(
        previstoMensalidades._sum.valor_mensalidade || 0,
      ),
      inadimplentes,
      saldo_previsto_salarios: Number(previstoSalarios._sum.salario || 0),
      matriculados_mes_atual: matriculadosMes,
    });
  } catch (err) {
    console.error("Erro Dashboard:", err.message);
    res.status(500).json({
      error: "Erro ao carregar dados do dashboard",
      details: err.message,
    });
  }
});

export default router;
