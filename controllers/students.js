import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// =========================================================================
// FUNÇÕES AUXILIARES (DATAS)
// =========================================================================

function formatLocalDate(date) {
  if (!date) return null;
  const d = new Date(date);
  // Ajusta para o fuso local para evitar que a data "volte um dia"
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

const formatDates = (aluno) => {
  if (!aluno) return aluno;
  return {
    ...aluno,
    data_nascimento: formatLocalDate(aluno.data_nascimento),
    data_matricula: formatLocalDate(aluno.data_matricula),
    criado_em: aluno.criado_em
      ? new Date(aluno.criado_em).toLocaleString("pt-BR")
      : null,
    atualizado_em: aluno.atualizado_em
      ? new Date(aluno.atualizado_em).toLocaleString("pt-BR")
      : null,
  };
};

// =========================================================================
// CONTROLLERS
// =========================================================================

// Listar todos os alunos
export const listarAlunos = async (req, res) => {
  try {
    const alunos = await prisma.alunos.findMany({
      orderBy: { id: "asc" },
    });
    res.status(200).json(alunos.map(formatDates));
  } catch (error) {
    console.error("❌ Erro ao listar alunos:", error.message);
    res.status(500).json({ error: "Erro ao buscar alunos" });
  }
};

// Buscar aluno por ID com Movimentações e Dados de Acesso
export const getAlunoComMovimentacoes = async (req, res) => {
  try {
    const { id } = req.params;

    const aluno = await prisma.alunos.findUnique({
      where: { id: parseInt(id) },
      include: {
        receitas: { orderBy: { data_pagamento: "desc" } },
        responsaveis_alunos: {
          include: { responsavel: true },
        },
      },
    });

    if (!aluno) {
      return res.status(404).json({ message: "Aluno não encontrado!" });
    }

    // Extrai dados do primeiro responsável vinculado
    const vinculo = aluno.responsaveis_alunos[0];
    const email_responsavel = vinculo?.responsavel?.email || "";
    const planoAcesso = vinculo?.responsavel?.plano || "basico";

    res.json({
      ...formatDates(aluno),
      plano: aluno.plano || planoAcesso,
      email_responsavel,
      movimentacoes: aluno.receitas.map((m) => {
        // Correção de fuso para o pai/extrato
        const d = new Date(m.data_pagamento);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return {
          ...m,
          data_pagamento: d.toISOString().split("T")[0],
        };
      }),
    });
  } catch (error) {
    console.error("❌ Erro ao buscar aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};

// Cadastrar Aluno com Transação Inteligente
export const cadastrar = async (req, res) => {
  const {
    nome,
    data_nascimento,
    responsavel,
    telefone,
    data_matricula,
    valor_mensalidade,
    serie,
    turno,
    observacao,
    status,
    plano,
    email_responsavel,
    dia_vencimento,
  } = req.body;

  if (plano === "premium" && !email_responsavel) {
    return res
      .status(400)
      .json({ error: "Email obrigatório para plano Premium." });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar Aluno
      const novoAluno = await tx.alunos.create({
        data: {
          nome,
          data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
          responsavel,
          telefone,
          data_matricula: data_matricula
            ? new Date(data_matricula)
            : new Date(),
          valor_mensalidade: valor_mensalidade
            ? parseFloat(valor_mensalidade)
            : null,
          serie,
          turno,
          observacao,
          status: status || "ativo",
          plano: plano || "padrao",
          dia_vencimento, // A nova coluna salva aqui
        },
      });

      let dadosAcesso = null;

      // 2. Lógica Premium
      if (plano === "premium") {
        let user = await tx.users.findUnique({
          where: { email: email_responsavel },
        });

        if (user) {
          if (user.plano !== "premium") {
            await tx.users.update({
              where: { id: user.id },
              data: { plano: "premium" },
            });
          }
        } else {
          const senhaLimpa = data_nascimento
            ? data_nascimento.replace(/[^0-9]/g, "")
            : "123456";
          const salt = await bcrypt.genSalt(10);
          const senhaHash = await bcrypt.hash(senhaLimpa, salt);

          user = await tx.users.create({
            data: {
              nome: responsavel,
              email: email_responsavel,
              senha: senhaHash,
              role: "responsavel",
              plano: "premium",
            },
          });
        }

        await tx.responsaveis_alunos.create({
          data: {
            responsavel_id: user.id,
            aluno_id: novoAluno.id,
            parentesco: "Responsável",
          },
        });

        dadosAcesso = {
          email: email_responsavel,
          msg: "Acesso Premium ativo!",
        };
      }

      return { novoAluno, dadosAcesso };
    });

    res.status(201).json({
      message: "Aluno cadastrado com sucesso.",
      student: formatDates(resultado.novoAluno),
      acesso: resultado.dadosAcesso,
    });
  } catch (error) {
    console.error("❌ Erro ao inserir aluno:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar aluno." });
  }
};

// Atualizar Aluno
export const atualizar = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const alunoAtualizado = await prisma.$transaction(async (tx) => {
      // 1. Atualiza Aluno
      const updated = await tx.alunos.update({
        where: { id: parseInt(id) },
        data: {
          ...data,
          data_nascimento: data.data_nascimento
            ? new Date(data.data_nascimento)
            : undefined,
          data_matricula: data.data_matricula
            ? new Date(data.data_matricula)
            : undefined,
          valor_mensalidade: data.valor_mensalidade
            ? parseFloat(data.valor_mensalidade)
            : undefined,
          atualizado_em: new Date(),
        },
      });

      // 2. Lógica de Sincronização de Plano com User
      if (data.plano) {
        const vinculo = await tx.responsaveis_alunos.findFirst({
          where: { aluno_id: parseInt(id) },
          select: { responsavel_id: true },
        });

        if (vinculo) {
          await tx.users.update({
            where: { id: vinculo.responsavel_id },
            data: {
              plano: data.plano === "premium" ? "premium" : "basico",
              email: data.email_responsavel || undefined,
            },
          });
        }
      }
      return updated;
    });

    res.status(200).json({
      message: "Aluno atualizado!",
      student: formatDates(alunoAtualizado),
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar aluno:", error.message);
    res.status(500).json({ error: "Erro ao atualizar aluno no banco." });
  }
};

// Deletar Aluno
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const deletado = await prisma.alunos.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({
      message: "Aluno deletado com sucesso",
      student: formatDates(deletado),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar aluno:", error.message);
    res.status(500).json({ error: "Aluno não encontrado ou erro no banco." });
  }
};

// Listar filhos do Responsável Logado
export const listarMeusFilhos = async (req, res) => {
  try {
    const idResponsavel = req.userId;
    if (!idResponsavel)
      return res.status(401).json({ error: "Não autenticado." });

    const filhos = await prisma.alunos.findMany({
      where: {
        responsaveis_alunos: {
          some: { responsavel_id: idResponsavel },
        },
      },
    });

    res.status(200).json(filhos.map(formatDates));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar alunos vinculados." });
  }
};

export const atualizarFotoAluno = async (req, res) => {
  try {
    const { id } = req.params;
    const responsavelId = req.userId;

    if (!req.file)
      return res.status(400).json({ error: "Nenhuma foto enviada." });

    const vinculo = await prisma.responsaveis_alunos.findFirst({
      where: { aluno_id: parseInt(id), responsavel_id: responsavelId },
    });

    if (!vinculo) return res.status(403).json({ error: "Sem permissão." });

    const fotoUrl = `${req.protocol}://${req.get("host")}/uploads/alunos/fotos/${req.file.filename}`;

    await prisma.alunos.update({
      where: { id: parseInt(id) },
      data: { foto_url: fotoUrl },
    });

    res.status(200).json({ foto_url: fotoUrl });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar foto." });
  }
};
