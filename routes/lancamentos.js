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

    // 1️⃣ Buscar lançamentos
    const queryLancamentos = `
      SELECT
        l.lancamento_id,
        l.tipo,
        l.origem_id,
        l.descricao,
        l.valor,
        -- Ajuste fuso horário para São Paulo
        COALESCE(
          (m.criado_em AT TIME ZONE 'America/Sao_Paulo'),
          (l.data AT TIME ZONE 'America/Sao_Paulo')
        )::date AS data,
        a.nome AS nome_aluno,
        p.nome AS nome_professor,
        'Finalizada' AS status
      FROM public.lancamentos l
      LEFT JOIN public.receitas m
        ON l.origem_id = m.id_mensalidade AND l.tipo = 'receita'
      LEFT JOIN public.alunos a
        ON l.id_aluno = a.id
      LEFT JOIN public.professores p
        ON l.id_professor = p.id
      WHERE
        ($1::date IS NULL OR COALESCE(
          (m.criado_em AT TIME ZONE 'America/Sao_Paulo'),
          (l.data AT TIME ZONE 'America/Sao_Paulo')
        )::date >= $1)
        AND ($2::date IS NULL OR COALESCE(
          (m.criado_em AT TIME ZONE 'America/Sao_Paulo'),
          (l.data AT TIME ZONE 'America/Sao_Paulo')
        )::date <= $2)
      ORDER BY COALESCE(
        (m.criado_em AT TIME ZONE 'America/Sao_Paulo'),
        (l.data AT TIME ZONE 'America/Sao_Paulo')
      ) DESC
    `;
    const lancamentosResult = await pool.query(queryLancamentos, params);

    // 2️⃣ Resumo financeiro
    const queryResumo = `
      SELECT
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total_receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS total_despesas,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) AS saldo
      FROM public.lancamentos l
      LEFT JOIN public.receitas m
        ON l.origem_id = m.id_mensalidade AND l.tipo = 'receita'
      WHERE
        ($1::date IS NULL OR COALESCE(
          (m.criado_em AT TIME ZONE 'America/Sao_Paulo'),
          (l.data AT TIME ZONE 'America/Sao_Paulo')
        )::date >= $1)
        AND ($2::date IS NULL OR COALESCE(
          (m.criado_em AT TIME ZONE 'America/Sao_Paulo'),
          (l.data AT TIME ZONE 'America/Sao_Paulo')
        )::date <= $2)
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
