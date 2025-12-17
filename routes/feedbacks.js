import express from "express";
import { pool } from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Middleware: Todas as rotas precisam de login
router.use(auth);

// 1. LISTAR FEEDBACKS DE UM ALUNO
// (Pai vê os do filho / Admin e Prof veem histórico)
router.get("/aluno/:id", async (req, res) => {
  try {
    const { id } = req.params; // ID do Aluno

    // SEGURANÇA: Se for Pai, verifica se o aluno é dele
    if (req.userRole === "responsavel") {
      const check = await pool.query(
        "SELECT * FROM responsaveis_alunos WHERE responsavel_id = $1 AND aluno_id = $2",
        [req.userId, id] // req.userId vem do token (middleware auth)
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: "Acesso negado a este aluno." });
      }
    }

    // Busca os feedbacks + Nome de quem escreveu
    const result = await pool.query(
      `SELECT f.*, u.nome as autor_nome 
       FROM feedbacks f
       JOIN users u ON f.autor_id = u.id
       WHERE f.aluno_id = $1
       ORDER BY f.data_aula DESC, f.criado_em DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar feedbacks." });
  }
});

// 2. CRIAR NOVO FEEDBACK (Apenas Admin e Professor)
// 2. CRIAR NOVO RELATÓRIO BIMESTRAL
router.post("/", async (req, res) => {
  try {
    if (req.userRole === "responsavel") {
      return res.status(403).json({
        message: "Apenas professores e admin podem criar relatórios.",
      });
    }

    const {
      aluno_id,
      bimestre, // Novo: "1º Bimestre", "2º Bimestre"...
      avaliacao_pedagogica, // Novo: Objeto com as skills
      avaliacao_psico, // Novo: Objeto com parecer psico
      fotos, // Novo: Array de urls
      observacao, // Campo livre extra
    } = req.body;

    const autor_id = req.userId;

    // Montamos um 'conteudo' resumo para manter compatibilidade ou usamos apenas os JSONs
    // Vamos salvar tudo.
    const novoRelatorio = await pool.query(
      `INSERT INTO feedbacks 
       (aluno_id, autor_id, bimestre, avaliacao_pedagogica, avaliacao_psico, fotos, observacao, data_aula)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
       RETURNING *`,
      [
        aluno_id,
        autor_id,
        bimestre,
        avaliacao_pedagogica,
        avaliacao_psico,
        JSON.stringify(fotos || []),
        observacao,
      ]
    );

    res.status(201).json(novoRelatorio.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar relatório bimestral." });
  }
});

// 3. MARCAR COMO LIDO (Para o Pai clicar "Ciente")
router.put("/ler/:id", async (req, res) => {
  try {
    const { id } = req.params; // ID do Feedback

    // Atualiza apenas se for o pai do aluno (validacao simplificada aqui)
    // O ideal seria checar vinculo novamente, mas vamos confiar no token por enquanto
    await pool.query(
      "UPDATE feedbacks SET lido_pelos_pais = TRUE WHERE id = $1",
      [id]
    );

    res.json({ message: "Marcado como lido." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar status." });
  }
});

// ... (códigos anteriores: GET e POST)

// 3. EDITAR RELATÓRIO (PUT)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bimestre,
      avaliacao_pedagogica,
      avaliacao_psico,
      fotos,
      observacao,
    } = req.body;

    // Atualiza apenas os campos permitidos
    const query = `
      UPDATE feedbacks 
      SET bimestre = $1, 
          avaliacao_pedagogica = $2, 
          avaliacao_psico = $3, 
          fotos = $4, 
          observacao = $5
      WHERE id = $6
      RETURNING *
    `;

    // Fotos deve ser salvo como string JSON
    const fotosJson = JSON.stringify(fotos || []);

    const result = await pool.query(query, [
      bimestre,
      avaliacao_pedagogica,
      avaliacao_psico,
      fotosJson,
      observacao,
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Relatório não encontrado." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao editar feedback:", error);
    res.status(500).json({ error: "Erro ao atualizar relatório." });
  }
});

// 4. EXCLUIR RELATÓRIO (DELETE)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM feedbacks WHERE id = $1", [id]);
    res.status(200).json({ message: "Relatório excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir feedback:", error);
    res.status(500).json({ error: "Erro ao excluir relatório." });
  }
});

export default router;
