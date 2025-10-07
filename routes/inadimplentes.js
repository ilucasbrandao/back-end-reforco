// src/routes/inadimplentes.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/notificacao", async (req, res) => {
  const { mes, ano } = req.query;

  if (!mes || !ano || isNaN(mes) || isNaN(ano)) {
    return res.status(400).json({ error: "Mês ou ano inválido" });
  }

  try {
    const query = `
      SELECT a.id, a.nome, a.valor_mensalidade
      FROM alunos a
      WHERE a.status = 'ativo'
        -- Só alunos matriculados antes ou no mês analisado
        AND a.data_matricula <= make_date($2::int, $1::int, 1)
        -- Verifica se não existe pagamento no mês/ano
        AND NOT EXISTS (
          SELECT 1
          FROM receitas r
          WHERE r.id_aluno = a.id
            AND EXTRACT(MONTH FROM r.data_pagamento) = $1
            AND EXTRACT(YEAR FROM r.data_pagamento) = $2
        )
      ORDER BY a.nome
    `;

    const result = await pool.query(query, [mes, ano]);
    res.json({ inadimplentes: result.rows });
  } catch (err) {
    console.error("❌ Erro ao buscar inadimplentes:", err);
    res.status(500).json({ error: "Erro ao buscar inadimplentes" });
  }
});

export default router;
