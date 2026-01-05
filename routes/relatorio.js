import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/relatorio-mensal", async (req, res) => {
  const { mes, ano } = req.query;

  // Validação básica
  if (!mes || !ano || isNaN(mes) || isNaN(ano)) {
    return res.status(400).json({ error: "Mês ou ano inválido" });
  }

  try {
    // 1. Receitas do mês
    const receitas = await pool.query(
      `SELECT SUM(valor) as total FROM receitas 
       WHERE EXTRACT(MONTH FROM data_pagamento) = $1 
       AND EXTRACT(YEAR FROM data_pagamento) = $2`,
      [mes, ano]
    );

    // 2. Despesas do mês
    const despesas = await pool.query(
      `SELECT SUM(valor) as total FROM despesas 
       WHERE EXTRACT(MONTH FROM data_pagamento) = $1 
       AND EXTRACT(YEAR FROM data_pagamento) = $2`,
      [mes, ano]
    );

    // 3. Total de Alunos Ativos
    const alunos = await pool.query(
      `SELECT COUNT(*) as total FROM alunos WHERE status = 'ativo'`
    );

    // 4. Total de Professores Ativos
    const professores = await pool.query(
      `SELECT COUNT(*) as total FROM professores WHERE status = 'ativo'`
    );

    // 5. Novas Matrículas no Mês
    const novasMatriculas = await pool.query(
      `SELECT COUNT(*) as total FROM alunos 
       WHERE EXTRACT(MONTH FROM data_matricula) = $1 
       AND EXTRACT(YEAR FROM data_matricula) = $2`,
      [mes, ano]
    );

    // 6. Lista de Inadimplentes
    const inadimplentes = await pool.query(
      `SELECT id, nome, valor_mensalidade
       FROM alunos
       WHERE status = 'ativo'
         AND NOT EXISTS (
           SELECT 1
           FROM receitas
           WHERE receitas.id_aluno = alunos.id
             AND EXTRACT(MONTH FROM data_pagamento) = $1
             AND EXTRACT(YEAR FROM data_pagamento) = $2
         )`,
      [mes, ano]
    );

    // --- Processamento de Dados ---

    const totalReceitas = receitas.rows[0].total ? parseFloat(receitas.rows[0].total) : 0;
    const totalDespesas = despesas.rows[0].total ? parseFloat(despesas.rows[0].total) : 0;
    
    // Calcula o valor total da inadimplência somando a lista retornada (NOVO)
    const totalInadimplencia = inadimplentes.rows.reduce((acc, aluno) => {
      return acc + (parseFloat(aluno.valor_mensalidade) || 0);
    }, 0);

    // Resposta formatada para o Frontend
    res.json({
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,
      
      alunos_status: parseInt(alunos.rows[0].total) || 0,
      professores_status: parseInt(professores.rows[0].total) || 0,
      
      // Novos campos adicionados:
      novas_matriculas: parseInt(novasMatriculas.rows[0].total) || 0,
      inadimplencia_total: totalInadimplencia, // Valor monetário total que falta receber
      
      inadimplentes: inadimplentes.rows, // Lista detalhada para tabela 
    });

  } catch (err) {
    console.error("Erro no Relatório Mensal:", err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

export default router;