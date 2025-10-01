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

    // 1️⃣ Buscar lançamentos filtrados
    const queryLancamentos = `
      SELECT *
      FROM public.lancamentos
      WHERE ($1::date IS NULL OR data::date >= $1)
        AND ($2::date IS NULL OR data::date <= $2)
      ORDER BY data DESC
    `;
    const lancamentosResult = await pool.query(queryLancamentos, params);

    // 2️⃣ Calcular resumo
    const queryResumo = `
      SELECT
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total_receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS total_despesas,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) AS saldo
      FROM public.lancamentos
      WHERE ($1::date IS NULL OR data::date >= $1)
        AND ($2::date IS NULL OR data::date <= $2)
    `;
    const resumoResult = await pool.query(queryResumo, params);

    // Retornar tudo junto
    res.json({
      lancamentos: lancamentosResult.rows,
      resumo: resumoResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar lançamentos e resumo" });
  }
});

export default router;
