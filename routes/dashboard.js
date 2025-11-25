// src/routes/dashboard.js
import { Router } from "express";
import { pool } from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

// GET /dashboard?mes=11&ano=2024
router.get("/", async (req, res) => {
  try {
    let { mes, ano } = req.query;

    // Garante que mes e ano sejam números para o SQL
    const mesNum = Number(mes);
    const anoNum = Number(ano);

    // Define inicio e fim para consultas de intervalo (Lançamentos)
    const firstDay = `${ano}-${mes}-01`;
    // Pega o último dia do mês dinamicamente
    const lastDay = `${ano}-${mes}-${new Date(anoNum, mesNum, 0).getDate()}`;

    // 1️⃣ Quantidade de alunos ativos (Snapshot - Independe do mês)
    const { rows: alunosRows } = await pool.query(`
      SELECT COUNT(*) AS quantidade
      FROM alunos
      WHERE status = 'ativo'
    `);
    const alunos_ativos = Number(alunosRows[0].quantidade);

    // 2️⃣ Quantidade de professores ativos (Snapshot)
    const { rows: professoresRows } = await pool.query(`
      SELECT COUNT(*) AS quantidade
      FROM professores
      WHERE status = 'ativo'
    `);
    const professores_ativos = Number(professoresRows[0].quantidade);

    // 3️⃣ Alunos por turno (Snapshot)
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

    // 4️⃣ Saldo de caixa no período (CORRIGIDO: Já estava certo, usa firstDay/lastDay)
    const { rows: caixaRows } = await pool.query(
      `
      SELECT
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total_receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS total_despesas,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) AS saldo
      FROM lancamentos
      WHERE data >= $1::date AND data <= $2::date
    `,
      [firstDay, lastDay]
    );
    const saldo_caixa = Number(caixaRows[0].saldo || 0);

    // 5️⃣ Aniversariantes do mês SELECIONADO (CORRIGIDO)
    // Antes usava CURRENT_DATE, agora usa $1 (mesNum)
    const { rows: aniversariantesRows } = await pool.query(
      `
      SELECT nome, data_nascimento
      FROM alunos
      WHERE EXTRACT(MONTH FROM data_nascimento) = $1
        AND status = 'ativo'
      ORDER BY EXTRACT(DAY FROM data_nascimento)
    `,
      [mesNum]
    );

    // 6️⃣ Saldo previsto de mensalidades (Snapshot)
    const { rows: mensalidadesRows } = await pool.query(`
      SELECT SUM(valor_mensalidade) AS saldo_previsto
      FROM alunos
      WHERE status = 'ativo'
    `);
    const saldo_previsto_mensalidades = Number(
      mensalidadesRows[0].saldo_previsto || 0
    );

    // 7️⃣ Aniversariantes Professores (CORRIGIDO)
    const { rows: professoresAniversariantesRows } = await pool.query(
      `
      SELECT nome, data_nascimento
      FROM professores
      WHERE EXTRACT(MONTH FROM data_nascimento) = $1
        AND status = 'ativo'
      ORDER BY EXTRACT(DAY FROM data_nascimento)
    `,
      [mesNum]
    );

    // 8️⃣ Saldo previsto com salários (Snapshot)
    const { rows: salariosRows } = await pool.query(`
      SELECT COALESCE(SUM(salario::numeric), 0) AS total_salarios
      FROM professores
      WHERE status = 'ativo'  
    `);
    const saldo_previsto_salarios = Number(salariosRows[0].total_salarios || 0);

    // 9️⃣ Matriculados no mês SELECIONADO (CORRIGIDO)
    // Agora verifica se a matrícula foi no mês/ano do filtro
    const { rows: matriculadosRows } = await pool.query(
      `
      SELECT COUNT(*) AS quantidade
      FROM alunos
      WHERE EXTRACT(MONTH FROM data_matricula) = $1
        AND EXTRACT(YEAR FROM data_matricula) = $2
        AND status = 'ativo'
    `,
      [mesNum, anoNum]
    );

    const matriculados_mes_atual = Number(matriculadosRows[0].quantidade || 0);

    // 🔟 Inadimplentes do mês SELECIONADO (CORRIGIDO E MELHORADO)
    // A lógica aqui deve buscar na tabela 'receitas' pelo mes_referencia e ano_referencia
    // Se você não tiver essas colunas, use data_pagamento, mas referência é o ideal para mensalidade.
    // Assumindo que sua tabela receitas tem 'mes_referencia' e 'ano_referencia' (como fizemos no front):

    const { rows: inadimplentesRows } = await pool.query(
      `
      SELECT id, nome, valor_mensalidade, telefone
      FROM alunos
      WHERE status = 'ativo'
        AND NOT EXISTS (
          SELECT 1
          FROM receitas
          WHERE receitas.id_aluno = alunos.id
            AND receitas.mes_referencia = $1
            AND receitas.ano_referencia = $2
        )
    `,
      [mesNum, anoNum]
    );

    /* ⚠️ NOTA: Se o seu banco NÃO tiver as colunas mes_referencia/ano_referencia na tabela 'receitas',
       use a versão abaixo baseada na data do pagamento:
       
       AND EXTRACT(MONTH FROM data_pagamento) = $1
       AND EXTRACT(YEAR FROM data_pagamento) = $2
    */

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
      inadimplentes: inadimplentesRows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar dados do dashboard" });
  }
});

export default router;
