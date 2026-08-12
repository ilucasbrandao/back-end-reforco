import prisma from "../prisma.ts";

export const FeedbackController = {
  // LISTAR FEEDBACKS POR ALUNO
  async listarPorAluno(req, res) {
    try {
      const { id } = req.params;
      const alunoId = parseInt(id);

      // 🔐 Controle de acesso para responsáveis
      if (req.userRole === "responsavel") {
        const vinculo = await prisma.responsaveis_alunos.findFirst({
          where: {
            responsavel_id: req.userId,
            aluno_id: alunoId,
          },
        });

        if (!vinculo) {
          return res
            .status(403)
            .status(403)
            .json({ message: "Acesso negado a este aluno." });
        }
      }

      const feedbacks = await prisma.feedbacks.findMany({
        where: { aluno_id: alunoId },
        orderBy: { criado_em: "desc" },
        include: {
          autor: {
            select: { nome: true },
          },
        },
      });

      // Normalização: Trazemos o parecer_atendimento se houver, mas mantemos os objetos JSON antigos vivos
      const normalizados = feedbacks.map((item) => ({
        ...item,
        parecer_atendimento: item.parecer_atendimento || null,
        avaliacao_pedagogica: item.avaliacao_pedagogica || {},
        avaliacao_psico: item.avaliacao_psico || {},
        fotos: Array.isArray(item.fotos) ? item.fotos : [],
        lido_pelos_pais: item.lido_pelos_pais ?? false,
      }));

      res.json(normalizados);
    } catch (error) {
      console.error("Erro ao listar feedbacks:", error);
      res.status(500).json({ error: "Erro ao buscar feedbacks." });
    }
  },

  // CRIAR FEEDBACK (COM IMAGENS)
  async criar(req, res) {
    try {
      if (req.userRole === "responsavel") {
        return res.status(403).json({
          message: "Apenas professores e admin podem criar relatórios.",
        });
      }

      const {
        aluno_id,
        bimestre,
        avaliacao_pedagogica,
        avaliacao_psico,
        observacao,
        parecer_atendimento,
        fotos_existentes,
      } = req.body;

      // Parsing seguro (para não quebrar cadastros que venham incompletos)
      let pedagogicoParsed = {};
      let psicoParsed = {};

      try {
        if (avaliacao_pedagogica) {
          pedagogicoParsed =
            typeof avaliacao_pedagogica === "string"
              ? JSON.parse(avaliacao_pedagogica)
              : avaliacao_pedagogica;
        }
        if (avaliacao_psico) {
          psicoParsed =
            typeof avaliacao_psico === "string"
              ? JSON.parse(avaliacao_psico)
              : avaliacao_psico;
        }
      } catch (e) {
        return res
          .status(400)
          .json({ error: "Erro no formato dos dados JSON" });
      }

      // URLs das fotos
      const novasFotos =
        req.files?.map(
          (file) =>
            `${req.protocol}://${req.get("host")}/uploads/feedbacks/imagens/${file.filename}`,
        ) || [];

      let fotosFinais = [...novasFotos];

      // Salvar no Banco
      const novoFeedback = await prisma.feedbacks.create({
        data: {
          aluno_id: parseInt(aluno_id),
          autor_id: req.userId,
          bimestre,
          parecer_atendimento: parecer_atendimento || null,
          avaliacao_pedagogica: pedagogicoParsed,
          avaliacao_psico: psicoParsed,
          fotos: fotosFinais,
          observacao,
        },
      });

      res.status(201).json(novoFeedback);
    } catch (error) {
      console.error("Erro ao criar feedback:", error);
      res.status(500).json({ error: "Erro ao criar relatório." });
    }
  },

  // MARCAR COMO LIDO
  async marcarComoLido(req, res) {
    try {
      await prisma.feedbacks.update({
        where: { id: parseInt(req.params.id) },
        data: { lido_pelos_pais: true },
      });
      res.json({ message: "Marcado como lido." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar status." });
    }
  },

  // ATUALIZAR FEEDBACK
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        bimestre,
        avaliacao_pedagogica,
        avaliacao_psico,
        observacao,
        parecer_atendimento,
        fotos_existentes,
      } = req.body;

      let pedagogicoParsed = {};
      let psicoParsed = {};
      try {
        if (avaliacao_pedagogica) {
          pedagogicoParsed =
            typeof avaliacao_pedagogica === "string"
              ? JSON.parse(avaliacao_pedagogica)
              : avaliacao_pedagogica;
        }
        if (avaliacao_psico) {
          psicoParsed =
            typeof avaliacao_psico === "string"
              ? JSON.parse(avaliacao_psico)
              : avaliacao_psico;
        }
      } catch (e) {}

      const novasFotos =
        req.files?.map(
          (file) =>
            `${req.protocol}://${req.get("host")}/uploads/feedbacks/imagens/${file.filename}`,
        ) || [];

      let fotosFinais = [...novasFotos];

      if (fotos_existentes) {
        try {
          const existentes =
            typeof fotos_existentes === "string"
              ? JSON.parse(fotos_existentes)
              : fotos_existentes;
          if (Array.isArray(existentes)) {
            fotosFinais = [...existentes, ...fotosFinais];
          }
        } catch (e) {}
      }

      const atualizado = await prisma.feedbacks.update({
        where: { id: parseInt(id) },
        data: {
          bimestre,
          parecer_atendimento: parecer_atendimento || null,
          avaliacao_pedagogica: pedagogicoParsed,
          avaliacao_psico: psicoParsed,
          observacao,
          fotos: fotosFinais,
        },
      });

      res.json(atualizado);
    } catch (error) {
      console.error("Erro ao atualizar feedback:", error);
      res.status(500).json({ error: "Erro ao atualizar relatório." });
    }
  },

  // EXCLUIR FEEDBACK
  async deletar(req, res) {
    try {
      await prisma.feedbacks.delete({
        where: { id: parseInt(req.params.id) },
      });
      res.json({ message: "Relatório excluído com sucesso." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir relatório." });
    }
  },
};
