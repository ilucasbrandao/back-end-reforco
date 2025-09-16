import { pool } from "../db.js";

export const getResumoDashboard = async (req, res) => {
  try {
    const [
      [matriculas],
      [entradas],
      [saidas],
      [ativos],
      [inativos],
      [profAtivos],
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total FROM alunos WHERE data_matricula >= CURDATE() - INTERVAL 7 DAY`
      ),
      pool.query(
        `SELECT SUM(valor) AS total FROM financeiro WHERE tipo = 'entrada'`
      ),
      pool.query(
        `SELECT SUM(valor) AS total FROM financeiro WHERE tipo = 'saida'`
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM alunos WHERE situacao = 'ativo'`
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM alunos WHERE situacao = 'inativo'`
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM professores WHERE situacao = 'ativo'`
      ),
    ]);

    res.json({
      ultimasMatriculas: matriculas[0].total,
      saldoEntradas: entradas[0].total || 0,
      saldoSaidas: saidas[0].total || 0,
      alunosAtivos: ativos[0].total,
      alunosInativos: inativos[0].total,
      professoresAtivos: profAtivos[0].total,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo do dashboard:", error.message);
    res.status(500).json({ error: "Erro ao buscar resumo do dashboard" });
  }
};
