import { pool } from "../db.js";

//! Dashboard da tela inicial
export const getResumoDashboard = async (req, res) => {
  try {
    const [matriculasRecentes] = await pool.query(
      `SELECT COUNT(*) AS total FROM alunos WHERE dataMatricula >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    const [entradas] = await pool.query(
      `SELECT SUM(valor) AS total FROM financeiro WHERE tipo = 'entrada'`
    );

    const [saidas] = await pool.query(
      `SELECT SUM(valor) AS total FROM financeiro WHERE tipo = 'saida'`
    );

    const [alunosAtivos] = await pool.query(
      `SELECT COUNT(*) AS total FROM alunos WHERE situacao = 'ativo'`
    );

    const [alunosInativos] = await pool.query(
      `SELECT COUNT(*) AS total FROM alunos WHERE situacao = 'inativo'`
    );

    const [professoresAtivos] = await pool.query(
      `SELECT COUNT(*) AS total FROM professores WHERE situacao = 'ativo'`
    );

    res.json({
      ultimasMatriculas: matriculasRecentes[0].total,
      saldoEntradas: entradas[0].total || 0,
      saldoSaidas: saidas[0].total || 0,
      alunosAtivos: alunosAtivos[0].total,
      alunosInativos: alunosInativos[0].total,
      professoresAtivos: professoresAtivos[0].total,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo do dashboard:", error.message);
    res.status(500).json({ error: "Erro ao buscar resumo" });
  }
};
