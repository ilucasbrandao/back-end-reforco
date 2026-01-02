import { FeedbackModel } from "../models/feedback.js";
import { pool } from "../db.js";
import { feedbackUpdateSchema } from "../schemas/feedback.js";
import { ZodError } from "zod";

export const FeedbackController = {
  // ======================================================
  // LISTAR FEEDBACKS POR ALUNO
  // ======================================================
  async listarPorAluno(req, res) {
    try {
      const { id } = req.params;

      // 🔐 Controle de acesso para responsáveis
      if (req.userRole === "responsavel") {
        const check = await pool.query(
          `SELECT 1 FROM responsaveis_alunos
           WHERE responsavel_id = $1 AND aluno_id = $2`,
          [req.userId, id]
        );

        if (check.rowCount === 0) {
          return res
            .status(403)
            .json({ message: "Acesso negado a este aluno." });
        }
      }

      const result = await FeedbackModel.listarPorAluno(id);

      // 🛡️ Defesa + normalização de dados
      const rows = result.rows.map((item) => ({
        ...item,
        avaliacao_pedagogica: item.avaliacao_pedagogica || {},
        avaliacao_psico: item.avaliacao_psico || {},
        fotos:
          typeof item.fotos === "string"
            ? JSON.parse(item.fotos)
            : item.fotos || [],
        lido_pelos_pais: item.lido_pelos_pais ?? false,
      }));

      res.json(rows);
    } catch (error) {
      console.error("Erro ao listar feedbacks:", error);
      res.status(500).json({ error: "Erro ao buscar feedbacks." });
    }
  },

  // ======================================================
  // CRIAR FEEDBACK (COM IMAGENS)
  // ======================================================
  async criar(req, res) {
    try {
      // 🔐 Regra de acesso
      if (req.userRole === "responsavel") {
        return res.status(403).json({
          message: "Apenas professores e admin podem criar relatórios.",
        });
      }

      // ==========================
      // 1. DADOS DO FORM
      // ==========================
      const {
        aluno_id,
        bimestre,
        avaliacao_pedagogica,
        avaliacao_psico,
        observacao,
      } = req.body;

      // 🔁 Como veio via FormData, precisamos converter
      const pedagogicoParsed = avaliacao_pedagogica
        ? JSON.parse(avaliacao_pedagogica)
        : {};

      const psicoParsed = avaliacao_psico ? JSON.parse(avaliacao_psico) : {};

      // ==========================
      // 2. IMAGENS (MULTER)
      // ==========================
      const fotos =
        req.files?.map((file) => {
          return `${req.protocol}://${req.get(
            "host"
          )}/uploads/feedbacks/imagens/${file.filename}`;
        }) || [];

      // ==========================
      // 3. SALVAR NO BANCO
      // ==========================
      const result = await FeedbackModel.criar({
        aluno_id,
        autor_id: req.userId,
        bimestre,
        avaliacao_pedagogica: pedagogicoParsed,
        avaliacao_psico: psicoParsed,
        fotos,
        observacao,
      });

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Erro ao criar feedback:", error);
      res.status(500).json({ error: "Erro ao criar relatório." });
    }
  },

  // ======================================================
  // MARCAR COMO LIDO
  // ======================================================
  async marcarComoLido(req, res) {
    try {
      await FeedbackModel.marcarComoLido(req.params.id);
      res.json({ message: "Marcado como lido." });
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
      res.status(500).json({ error: "Erro ao atualizar status." });
    }
  },

  // ======================================================
  // ATUALIZAR FEEDBACK
  // ======================================================
  async atualizar(req, res) {
    try {
      const data = feedbackUpdateSchema.parse(req.body);

      const result = await FeedbackModel.atualizar(req.params.id, data);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Relatório não encontrado." });
      }

      res.json(result.rows[0]);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: error.errors,
        });
      }

      console.error("Erro ao atualizar feedback:", error);
      res.status(500).json({ error: "Erro ao atualizar relatório." });
    }
  },

  // ======================================================
  // EXCLUIR FEEDBACK
  // ======================================================
  async deletar(req, res) {
    try {
      await FeedbackModel.deletar(req.params.id);
      res.json({ message: "Relatório excluído com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir feedback:", error);
      res.status(500).json({ error: "Erro ao excluir relatório." });
    }
  },
};
