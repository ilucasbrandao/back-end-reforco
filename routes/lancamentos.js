import { Router } from "express";
import { pool } from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

// GET /lancamentos?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const params = [inicio || null, fim || null];

    // 1️⃣ Buscar lançamentos (receitas usam data_pagamento, despesas usam l.data)
    const queryLancamentos = `
      SELECT
        l.lancamento_id,
        l.tipo,
        l.origem_id,
        l.descricao,
        l.valor,
        'Finalizada' AS status,
        COALESCE(
            TO_CHAR(m.data_pagamento, 'YYYY-MM-DD'), -- data de pagamento da receita
            TO_CHAR(l.data, 'YYYY-MM-DD')            -- data da despesa
        ) AS data,
        a.nome AS nome_aluno,
        p.nome AS nome_professor
      FROM public.lancamentos l
      LEFT JOIN public.receitas m
        ON l.origem_id = m.id_mensalidade AND l.tipo = 'receita'
      LEFT JOIN public.alunos a
        ON l.id_aluno = a.id
      LEFT JOIN public.professores p
        ON l.id_professor = p.id
      WHERE
        ($1::date IS NULL OR COALESCE(m.data_pagamento, l.data)::date >= $1)
        AND ($2::date IS NULL OR COALESCE(m.data_pagamento, l.data)::date <= $2)
      ORDER BY COALESCE(m.data_pagamento, l.data) DESC
    `;

    const lancamentosResult = await pool.query(queryLancamentos, params);

    // 2️⃣ Calcular resumo
    const queryResumo = `
      SELECT
        SUM(CASE WHEN l.tipo = 'receita' THEN COALESCE(m.valor, l.valor) ELSE 0 END) AS total_receitas,
        SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor ELSE 0 END) AS total_despesas,
        SUM(CASE WHEN l.tipo = 'receita' THEN COALESCE(m.valor, l.valor) ELSE -l.valor END) AS saldo
      FROM public.lancamentos l
      LEFT JOIN public.receitas m
        ON l.origem_id = m.id_mensalidade AND l.tipo = 'receita'
      WHERE
        ($1::date IS NULL OR COALESCE(m.data_pagamento, l.data)::date >= $1)
        AND ($2::date IS NULL OR COALESCE(m.data_pagamento, l.data)::date <= $2)
    `;
    const resumoResult = await pool.query(queryResumo, params);

    res.json({
      lancamentos: lancamentosResult.rows,
      resumo: resumoResult.rows[0],
    });
  } catch (err) {
    console.error("❌ Erro ao buscar lançamentos e resumo:", err);
    res.status(500).json({ error: "Erro ao buscar lançamentos e resumo" });
  }
});

export default router;
