import { Router } from "express";
import prisma from "../prisma.js"; // Import centralizado
import auth from "../middleware/auth.js";

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

    // Intervalo de datas para o Prisma (Lançamentos de Caixa)
    const dataInicio = new Date(anoNum, mesNum - 1, 1);
    const dataFim = new Date(anoNum, mesNum, 1);

    // --- EXECUÇÃO EM PARALELO (Mais rápido que o Pool antigo) ---
    const [
      alunosAtivos,
      professoresAtivos,
      turnoGroup,
      lancamentosPeriodo,
      alunosAniv,
      professoresAniv,
      previstoMensalidades,
      previstoSalarios,
      matriculadosMes,
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

      // 4. Saldo de Caixa (Receitas e Despesas)
      prisma.lancamentos.findMany({
        where: { data: { gte: dataInicio, lt: dataFim } },
        select: { tipo: true, valor: true },
      }),

      // 5. Aniversariantes Alunos (Usando Raw Query apenas para o EXTRACT, que é específico)
      prisma.$queryRaw`SELECT nome, data_nascimento FROM alunos WHERE EXTRACT(MONTH FROM data_nascimento) = ${mesNum} AND status = 'ativo' ORDER BY EXTRACT(DAY FROM data_nascimento)`,

      // 7. Aniversariantes Professores
      prisma.$queryRaw`SELECT nome, data_nascimento FROM professores WHERE EXTRACT(MONTH FROM data_nascimento) = ${mesNum} AND status = 'ativo' ORDER BY EXTRACT(DAY FROM data_nascimento)`,

      // 6. Saldo Previsto Mensalidades
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
    ]);

    // --- PROCESSAMENTO DOS RESULTADOS ---

    // Turnos
    const alunos_por_turno = {};
    turnoGroup.forEach((tg) => {
      alunos_por_turno[tg.turno] = tg._count;
    });

    // Saldo de Caixa
    const saldo_caixa = lancamentosPeriodo.reduce((acc, curr) => {
      const v = Number(curr.valor);
      return curr.tipo === "receita" ? acc + v : acc - v;
    }, 0);

    // 10. Inadimplentes (Alunos ativos que não possuem receita no mês/ano)
    // O Prisma facilita muito essa query complexa
    const inadimplentes = await prisma.alunos.findMany({
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
      select: { id: true, nome: true, valor_mensalidade: true, telefone: true },
    });

    res.json({
      alunos_ativos: alunosAtivos,
      professores_ativos: professoresAtivos,
      alunos_por_turno,
      saldo_caixa,
      aniversariantes: alunosAniv,
      professoresAniversariantes: professoresAniv,
      saldo_previsto_mensalidades: Number(
        previstoMensalidades._sum.valor_mensalidade || 0,
      ),
      saldo_previsto_salarios: Number(previstoSalarios._sum.salario || 0),
      matriculados_mes_atual: matriculadosMes,
      inadimplentes,
    });
  } catch (err) {
    console.error("Erro Dashboard:", err.message);
    res.status(500).json({ error: "Erro ao carregar dados do dashboard" });
  }
});

export default router;
