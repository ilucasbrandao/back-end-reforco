app.get("/relatorio-mensal", async (req, res) => {
  const { mes, ano } = req.query;

  try {
    const receitas = await db.query(
      `
      SELECT SUM(valor) as total_receitas
      FROM receitas
      WHERE EXTRACT(MONTH FROM data_pagamento) = $1
        AND EXTRACT(YEAR FROM data_pagamento) = $2
    `,
      [mes, ano]
    );

    const despesas = await db.query(
      `
      SELECT SUM(valor) as total_despesas
      FROM despesas
      WHERE EXTRACT(MONTH FROM data_pagamento) = $1
        AND EXTRACT(YEAR FROM data_pagamento) = $2
    `,
      [mes, ano]
    );

    const alunos = await db.query(
      `SELECT COUNT(*) FROM alunos WHERE status = 'ativo'`
    );
    const professores = await db.query(
      `SELECT COUNT(*) FROM professores WHERE status = 'ativo'`
    );

    const saldo =
      (receitas.rows[0].total_receitas || 0) -
      (despesas.rows[0].total_despesas || 0);

    res.json({
      total_receitas: receitas.rows[0].total_receitas || 0,
      total_despesas: despesas.rows[0].total_despesas || 0,
      saldo,
      alunos_ativos: alunos.rows[0].count,
      professores_ativos: professores.rows[0].count,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ erro: "Erro ao gerar relatório mensal" });
  }
});
