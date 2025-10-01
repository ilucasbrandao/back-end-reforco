// src/routes/relatorio.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/relatorio-mensal", async (req, res) => {
  const { mes, ano } = req.query;

  if (!mes || !ano || isNaN(mes) || isNaN(ano)) {
    return res.status(400).json({ error: "Mês ou ano inválido" });
  }

  try {
    // Receitas
    const receitas = await pool.query(
      `SELECT SUM(valor) as total FROM receitas WHERE EXTRACT(MONTH FROM data_pagamento) = $1 AND EXTRACT(YEAR FROM data_pagamento) = $2`,
      [mes, ano]
    );

    // Despesas
    const despesas = await pool.query(
      `SELECT SUM(valor) as total FROM despesas WHERE EXTRACT(MONTH FROM data_pagamento) = $1 AND EXTRACT(YEAR FROM data_pagamento) = $2`,
      [mes, ano]
    );

    // Alunos ativos
    const alunos = await pool.query(
      `SELECT COUNT(*) as total FROM alunos WHERE status = 'ativo'`
    );

    // Professores ativos
    const professores = await pool.query(
      `SELECT COUNT(*) as total FROM professores WHERE status = 'ativo'`
    );

    const totalReceitas = receitas.rows[0].total
      ? parseFloat(receitas.rows[0].total)
      : 0;
    const totalDespesas = despesas.rows[0].total
      ? parseFloat(despesas.rows[0].total)
      : 0;

    res.json({
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,
      alunos_status: parseInt(alunos.rows[0].total) || 0,
      professores_status: parseInt(professores.rows[0].total) || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

export default router;
