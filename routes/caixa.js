// routes/caixa.js
import { Router } from "express";
import { pool } from "../db.js";
import dotenv from "dotenv";

dotenv.config();
const router = Router();

// Fechar caixa do mês atual
router.post("/", async (req, res) => {
  try {
    const usuario = req.user?.nome || "juliannekelly630"; // vindo do login/token

    const { mes, ano } = req.body;
    const now = new Date();
    const mesFinal = mes || now.getMonth() + 1;
    const anoFinal = ano || now.getFullYear();

    const result = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END),0) AS saldo
       FROM lancamentos
       WHERE EXTRACT(YEAR FROM data) = $1
         AND EXTRACT(MONTH FROM data) = $2`,
      [anoFinal, mesFinal]
    );

    const saldoFinal = result.rows[0].saldo;

    const fechamento = await pool.query(
      `INSERT INTO fechamento_mensal (ano, mes, saldo_final, usuario)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ano, mes) DO UPDATE 
       SET saldo_final = EXCLUDED.saldo_final,
           usuario = EXCLUDED.usuario,
           data_fechamento = NOW()
       RETURNING *`,
      [anoFinal, mesFinal, saldoFinal, usuario]
    );

    res.json({ sucesso: true, fechamento: fechamento.rows[0] });
  } catch (err) {
    console.error("Erro ao fechar caixa mensal:", err);
    res
      .status(500)
      .json({ sucesso: false, erro: "Erro ao fechar caixa mensal" });
  }
});

export default router;
