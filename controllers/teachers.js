import prisma from "../prisma.ts";
import { generateDefaultPassword, hashPassword } from "../utils/password.js";

// =========================================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// =========================================================================

const formatLocalDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
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
export const listarProfessores = async (req, res, next) => {
  try {
    const professores = await prisma.professores.findMany({
      orderBy: { nome: "asc" },
      include: {
        user: {
          select: { email: true, role: true },
        },
      },
    });
    return res.status(200).json(professores.map(formatDates));
  } catch (error) {
    console.error("❌ Erro ao listar professores:", error);
    return res.status(500).json({ error: "Erro ao buscar professores." });
  }
};

// Buscar professor por ID com Despesas e Alunos vinculados
export const listarProfessoresID = async (req, res, next) => {
  try {
    const { id } = req.params;

    const professor = await prisma.professores.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: { email: true },
        },
        despesas: {
          orderBy: { data_pagamento: "desc" },
        },
        professores_alunos: {
          include: {
            aluno: {
              select: { id: true, nome: true, serie: true, turno: true },
            },
          },
        },
      },
    });

    if (!professor) {
      return res
        .status(404)
        .json({ message: "Professor(a) não encontrado(a)!" });
    }

    return res.json({
      ...formatDates(professor),
      email: professor.user?.email || null,
      alunos: professor.professores_alunos.map((item) => item.aluno),
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
    console.error("❌ Erro ao buscar professor:", error);
    return res
      .status(500)
      .json({ error: "Erro ao buscar dados do professor." });
  }
};

// Cadastrar Professor (Cria Usuário + Perfil + Alocação Inicial)
export const cadastrarProfessor = async (req, res, next) => {
  // Dados já validados e sanitizados pelo middleware 'validate(createProfessorSchema)'
  const {
    nome,
    email,
    data_nascimento,
    telefone,
    endereco,
    data_contratacao,
    nivel_ensino,
    turno,
    salario,
    status,
    alunos_ids,
  } = req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Verifica se e-mail já existe
      const userExistente = await tx.users.findUnique({
        where: { email },
      });

      if (userExistente) {
        throw new Error("Este e-mail já está cadastrado no sistema.");
      }

      // 2. Gera senha limpa (AAAAMMDD ou 123456) usando o utilitário centralizado
      const senhaLimpa = generateDefaultPassword(data_nascimento);
      const senhaHash = await hashPassword(senhaLimpa);

      // 3. Cria a conta na tabela 'users' com role "professor"
      const novoUsuario = await tx.users.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          role: "professor",
        },
      });

      // 4. Cria o perfil na tabela 'professores'
      const novoProfessor = await tx.professores.create({
        data: {
          user_id: novoUsuario.id,
          nome,
          data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
          telefone,
          endereco,
          data_contratacao: data_contratacao
            ? new Date(data_contratacao)
            : null,
          nivel_ensino,
          turno,
          salario: salario ? parseFloat(salario) : null,
          status: status || "ativo",
        },
      });

      // 5. Se houver alunos para alocação inicial, cria os vínculos
      if (Array.isArray(alunos_ids) && alunos_ids.length > 0) {
        const vinculos = alunos_ids.map((alunoId) => ({
          professor_id: novoProfessor.id,
          aluno_id: parseInt(alunoId),
        }));

        await tx.professores_alunos.createMany({
          data: vinculos,
        });
      }

      return { novoProfessor, senhaLimpa };
    });

    return res.status(201).json({
      message: "Professor(a) cadastrado(a) com sucesso.",
      teacher: formatDates(resultado.novoProfessor),
      acesso: {
        email,
        senhaInicial: resultado.senhaLimpa,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao cadastrar professor:", error.message);
    return res.status(400).json({
      error: error.message || "Erro interno ao cadastrar professor(a).",
    });
  }
};

// Atualizar Professor
export const atualizarProfessor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      despesas,
      movimentacoes,
      id: _id,
      criado_em,
      user_id,
      alunos_ids,
      ...camposValidos
    } = req.body;

    const professorId = parseInt(id);

    const professorAtualizado = await prisma.$transaction(async (tx) => {
      // 1. Atualiza dados do perfil
      const professor = await tx.professores.update({
        where: { id: professorId },
        data: {
          ...camposValidos,
          nome: camposValidos.nome?.trim(),
          data_nascimento: camposValidos.data_nascimento
            ? new Date(camposValidos.data_nascimento)
            : undefined,
          data_contratacao: camposValidos.data_contratacao
            ? new Date(camposValidos.data_contratacao)
            : undefined,
          salario:
            camposValidos.salario !== undefined
              ? parseFloat(camposValidos.salario)
              : undefined,
          atualizado_em: new Date(),
        },
      });

      // 2. Se enviou nova lista de alunos_ids, atualiza a alocação (substituição limpa)
      if (Array.isArray(alunos_ids)) {
        await tx.professores_alunos.deleteMany({
          where: { professor_id: professorId },
        });

        if (alunos_ids.length > 0) {
          await tx.professores_alunos.createMany({
            data: alunos_ids.map((alunoId) => ({
              professor_id: professorId,
              aluno_id: parseInt(alunoId),
            })),
          });
        }
      }

      return professor;
    });

    return res.status(200).json({
      message: "Professor(a) atualizado(a) com sucesso.",
      teacher: formatDates(professorAtualizado),
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar professor:", error.message);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar professor(a) no banco." });
  }
};

// Deletar Professor (Remove Perfil + Usuário de Acesso em cascata)
export const deletarProfessor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const professorId = parseInt(id);

    const professor = await prisma.professores.findUnique({
      where: { id: professorId },
      select: { user_id: true },
    });

    if (!professor) {
      return res
        .status(404)
        .json({ message: "Professor(a) não encontrado(a)." });
    }

    // Ao deletar o usuário na tabela 'users', a deleção em cascata (onDelete: Cascade) remove o perfil
    if (professor.user_id) {
      await prisma.users.delete({
        where: { id: professor.user_id },
      });
    } else {
      await prisma.professores.delete({
        where: { id: professorId },
      });
    }

    return res.status(200).json({
      message:
        "Professor(a) e suas credenciais de acesso foram removidos com sucesso.",
    });
  } catch (error) {
    console.error("❌ Erro ao deletar professor:", error.message);
    return res.status(500).json({ error: "Erro ao deletar professor(a)." });
  }
};
