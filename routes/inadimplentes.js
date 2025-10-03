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
    const result = await pool.query(
      `SELECT a.id, a.nome, a.valor_mensalidade
   FROM alunos a
   WHERE a.status = 'ativo'
     AND a.data_matricula <= make_date($2::int, $1::int, 1)
     AND NOT EXISTS (
       SELECT 1
       FROM receitas r
       WHERE r.id_aluno = a.id
         AND r.data_pagamento <= (a.data_matricula + INTERVAL '1 month')
     )
     AND EXTRACT(MONTH FROM (a.data_matricula + INTERVAL '1 month')) = $1
     AND EXTRACT(YEAR FROM (a.data_matricula + INTERVAL '1 month')) = $2`,
      [mes, ano]
    );

    res.json({ inadimplentes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar inadimplentes" });
  }
});

export default router;
