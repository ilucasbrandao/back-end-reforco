// src/routes/dashboard.js
import { Router } from "express";
import { pool } from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

// GET /dashboard?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    let { inicio, fim, mes, ano } = req.query;

    if (mes && ano) {
      const firstDay = `${ano}-${mes}-01`;
      const lastDay = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;
      inicio = firstDay;
      fim = lastDay;
    }

    // 1️⃣ Quantidade de alunos ativos
    const { rows: alunosRows } = await pool.query(`
      SELECT COUNT(*) AS quantidade
      FROM alunos
      WHERE status = 'ativo'
    `);
    const alunos_ativos = Number(alunosRows[0].quantidade);

    // 2️⃣ Quantidade de professores ativos
    const { rows: professoresRows } = await pool.query(`
      SELECT COUNT(*) AS quantidade
      FROM professores
      WHERE status = 'ativo'
    `);
    const professores_ativos = Number(professoresRows[0].quantidade);

    // 3️⃣ Alunos por turno
    const { rows: turnoRows } = await pool.query(`
      SELECT turno, COUNT(*) AS quantidade
      FROM alunos
      WHERE status = 'ativo'
      GROUP BY turno
    `);
    const alunos_por_turno = {};
    turnoRows.forEach(
      (r) => (alunos_por_turno[r.turno] = Number(r.quantidade))
    );

    // 4️⃣ Saldo de caixa no período
    const { rows: caixaRows } = await pool.query(
      `
      SELECT
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total_receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS total_despesas,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) AS saldo
      FROM lancamentos
      WHERE ($1::date IS NULL OR data::date >= $1)
        AND ($2::date IS NULL OR data::date <= $2)
    `,
      [inicio || null, fim || null]
    );
    const saldo_caixa = Number(caixaRows[0].saldo || 0);

    // 5️⃣ Aniversariantes do mês atual
    const { rows: aniversariantesRows } = await pool.query(`
      SELECT nome, data_nascimento
      FROM alunos
      WHERE EXTRACT(MONTH FROM data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND status = 'ativo'
      ORDER BY EXTRACT(DAY FROM data_nascimento)
    `);

    // 6️⃣ Saldo previsto de mensalidades (somando valor cadastrado por aluno)
    const { rows: mensalidadesRows } = await pool.query(`
      SELECT SUM(valor_mensalidade) AS saldo_previsto
      FROM alunos
      WHERE status = 'ativo'
    `);
    const saldo_previsto_mensalidades = Number(
      mensalidadesRows[0].saldo_previsto || 0
    );

    // 5️⃣ Aniversariantes do mês atual
    const { rows: professoresAniversariantesRows } = await pool.query(`
      SELECT nome, data_nascimento
      FROM professores
      WHERE EXTRACT(MONTH FROM data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND status = 'ativo'
      ORDER BY EXTRACT(DAY FROM data_nascimento)
    `);

    // 7️⃣ Saldo previsto com salários
    const { rows: salariosRows } = await pool.query(`
      SELECT COALESCE(SUM(salario::numeric), 0) AS total_salarios
      FROM professores
      WHERE status = 'ativo'  
    `);
    const saldo_previsto_salarios = Number(salariosRows[0].total_salarios || 0);

    // 8️⃣ Matriculados no mês atual
    const { rows: matriculadosRows } = await pool.query(`
  SELECT COUNT(*) AS quantidade
  FROM alunos
  WHERE EXTRACT(MONTH FROM data_matricula) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM data_matricula) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND status = 'ativo'
`);
    const matriculados_mes_atual = Number(matriculadosRows[0].quantidade || 0);

    res.json({
      alunos_ativos,
      professores_ativos,
      alunos_por_turno,
      saldo_caixa,
      aniversariantes: aniversariantesRows,
      professoresAniversariantes: professoresAniversariantesRows,
      saldo_previsto_mensalidades,
      saldo_previsto_salarios,
      matriculados_mes_atual,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar dados do dashboard" });
  }
});

export default router;
