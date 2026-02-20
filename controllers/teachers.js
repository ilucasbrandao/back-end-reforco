import prisma from "../prisma.js";

// =========================================================================
// FUNÇÕES AUXILIARES (DATAS)
// =========================================================================

const formatLocalDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  // Ajuste de fuso para garantir consistência (evita que volte 1 dia)
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

const formatDates = (professor) => {
  if (!professor) return professor;
  return {
    ...professor,
    data_nascimento: formatLocalDate(professor.data_nascimento),
    data_contratacao: formatLocalDate(professor.data_contratacao),
    criado_em: professor.criado_em ? professor.criado_em.toISOString() : null,
    atualizado_em: professor.atualizado_em
      ? professor.atualizado_em.toISOString()
      : null,
  };
};

// =========================================================================
// CONTROLLERS
// =========================================================================

// Listar todos os professores
export const listarProfessores = async (req, res) => {
  try {
    const professores = await prisma.professores.findMany({
      orderBy: { nome: "asc" },
    });
    res.status(200).json(professores.map(formatDates));
  } catch (error) {
    console.error("❌ Erro ao listar professores:", error.message);
    res.status(500).json({ error: "Erro ao buscar professores" });
  }
};

// Buscar professor por ID com Despesas (Movimentações)
export const listarProfessoresID = async (req, res) => {
  try {
    const { id } = req.params;

    const professor = await prisma.professores.findUnique({
      where: { id: parseInt(id) },
      include: {
        despesas: {
          orderBy: { data_pagamento: "desc" },
        },
      },
    });

    if (!professor) {
      return res.status(404).json({ message: "Professor não encontrado!" });
    }

    res.json({
      ...formatDates(professor),
      movimentacoes: professor.despesas.map((m) => {
        const d = new Date(m.data_pagamento);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return {
          ...m,
          data_pagamento: d.toISOString().split("T")[0],
        };
      }),
    });
  } catch (error) {
    console.error("❌ Erro ao buscar professor:", error.message);
    res.status(500).json({ error: "Erro ao buscar professor" });
  }
};

// Cadastrar Professor
export const cadastrarProfessor = async (req, res) => {
  try {
    const {
      nome,
      data_nascimento,
      telefone,
      endereco,
      data_contratacao,
      nivel_ensino,
      turno,
      salario,
      status,
    } = req.body;

    const newTeacher = await prisma.professores.create({
      data: {
        nome,
        data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
        telefone,
        endereco,
        data_contratacao: data_contratacao ? new Date(data_contratacao) : null,
        nivel_ensino,
        turno,
        salario: salario ? parseFloat(salario) : null,
        status: status || "ativo",
      },
    });

    res.status(201).json({
      message: "Professor(a) cadastrado com sucesso.",
      teacher: formatDates(newTeacher),
    });
  } catch (error) {
    console.error("❌ Erro ao inserir professor(a): ", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar professor(a)." });
  }
};

// Atualizar Professor
export const atualizarProfessor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      despesas,
      movimentacoes,
      id: _id,
      criado_em,
      ...camposValidos
    } = req.body;

    const professorAtualizado = await prisma.professores.update({
      where: { id: parseInt(id) },
      data: {
        ...camposValidos,
        nome: camposValidos.nome?.trim(),
        data_nascimento: camposValidos.data_nascimento
          ? new Date(camposValidos.data_nascimento)
          : undefined,
        data_contratacao: camposValidos.data_contratacao
          ? new Date(camposValidos.data_contratacao)
          : undefined,
        salario: camposValidos.salario
          ? parseFloat(camposValidos.salario)
          : undefined,
        atualizado_em: new Date(),
      },
    });

    res.status(200).json({
      message: "Professor(a) atualizado com sucesso",
      teacher: formatDates(professorAtualizado),
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar professor(a): ", error.message);
    res.status(500).json({ error: "Erro ao atualizar professor(a) no banco" });
  }
};

// Deletar Professor
export const deletarProfessor = async (req, res) => {
  try {
    const { id } = req.params;

    const professorDeletado = await prisma.professores.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      message: "Professor(a) deletado com sucesso",
      teacher: formatDates(professorDeletado),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar professor(a):", error.message);
    res
      .status(500)
      .json({ error: "Erro ao deletar professor(a) ou não encontrado." });
  }
};
