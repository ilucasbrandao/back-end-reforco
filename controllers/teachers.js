import prisma from "../prisma.ts";
import { generateDefaultPassword, hashPassword } from "../utils/password.js";

// Formatação de datas em string ISO (YYYY-MM-DD) sem deslocamento manual de timezone
const formatDateOnly = (date) =>
  date ? new Date(date).toISOString().split("T")[0] : null;

// Formatação do retorno dos dados do professor
const formatProfessorResponse = (professor) => {
  if (!professor) return null;
  return {
    ...professor,
    data_nascimento: formatDateOnly(professor.data_nascimento),
    data_contratacao: formatDateOnly(professor.data_contratacao),
    criado_em: professor.criado_em?.toISOString() || null,
    atualizado_em: professor.atualizado_em?.toISOString() || null,
  };
};

// =========================================================================
// LISTAR PROFESSORES
// =========================================================================
export const listarProfessores = async (req, res) => {
  try {
    const professores = await prisma.professores.findMany({
      orderBy: { nome: "asc" },
      include: {
        user: {
          select: { email: true, role: true },
        },
      },
    });
    return res.status(200).json(professores.map(formatProfessorResponse));
  } catch (error) {
    console.error(
      "❌ [LISTAR_PROFESSORES] Erro ao buscar lista no banco:",
      error,
    );
    return res.status(500).json({ error: "Erro ao buscar professores." });
  }
};

// =========================================================================
// BUSCAR PROFESSOR POR ID
// =========================================================================
export const listarProfessoresID = async (req, res) => {
  const { id } = req.params;
  const professorId = Number(id);

  if (isNaN(professorId)) {
    console.warn(`⚠️ [BUSCAR_PROFESSOR_ID] ID inválido fornecido: "${id}"`);
    return res
      .status(400)
      .json({ error: "O ID fornecido não é um número válido." });
  }

  try {
    const professor = await prisma.professores.findUnique({
      where: { id: professorId },
      include: {
        user: { select: { email: true } },
        despesas: { orderBy: { data_pagamento: "desc" } },
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

    const alunos = professor.professores_alunos.map((item) => item.aluno);
    const movimentacoes = professor.despesas.map((d) => ({
      ...d,
      data_pagamento: formatDateOnly(d.data_pagamento),
    }));

    return res.status(200).json({
      ...formatProfessorResponse(professor),
      email: professor.user?.email || null,
      alunos,
      movimentacoes,
    });
  } catch (error) {
    console.error(
      `❌ [BUSCAR_PROFESSOR_ID] Erro ao buscar professor ID ${professorId}:`,
      error,
    );
    return res
      .status(500)
      .json({ error: "Erro ao buscar dados do professor." });
  }
};

// =========================================================================
// CADASTRAR PROFESSOR (Com rastreamento completo de transação)
// =========================================================================
export const cadastrarProfessor = async (req, res) => {
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
      // Step 1: Verificar se o e-mail já está cadastrado
      const userExistente = await tx.users.findUnique({
        where: { email },
      });

      if (userExistente) {
        throw new Error("EMAIL_EXISTS");
      }

      // Step 2: Gerar senha inicial e hash
      const senhaLimpa = generateDefaultPassword(data_nascimento);
      const senhaHash = await hashPassword(senhaLimpa);

      // Step 3: Criar conta na tabela 'users'
      const novoUsuario = await tx.users.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          role: "professor",
        },
      });

      // Step 4: Criar o perfil na tabela 'professores'
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
          salario:
            salario !== undefined && salario !== null && salario !== ""
              ? parseFloat(salario)
              : null,
          status: status || "ativo",
        },
      });
      console.log(
        `   └ Perfil do Professor criado com sucesso - ID: ${novoProfessor.id}`,
      );

      // Step 5: Vincular Alunos (Se houver)
      if (Array.isArray(alunos_ids) && alunos_ids.length > 0) {
        const vinculos = alunos_ids.map((alunoId) => ({
          professor_id: novoProfessor.id,
          aluno_id: Number(alunoId),
        }));

        await tx.professores_alunos.createMany({
          data: vinculos,
        });
      }

      return { novoProfessor, senhaLimpa };
    });

    return res.status(201).json({
      message: "Professor(a) cadastrado(a) com sucesso.",
      teacher: formatProfessorResponse(resultado.novoProfessor),
      acesso: {
        email,
        senhaInicial: resultado.senhaLimpa,
      },
    });
  } catch (error) {
    if (error.message === "EMAIL_EXISTS") {
      return res
        .status(409)
        .json({ error: "Este e-mail já está cadastrado no sistema." });
    }

    console.error(
      "❌ [CADASTRO_PROFESSOR] Erro crítico na transação do banco de dados:",
    );
    console.error("   Mensagem:", error.message);
    console.error("   Código do Erro (Prisma):", error.code);
    console.error("   Stack Trace:", error.stack);

    return res.status(500).json({
      error:
        "Erro interno ao cadastrar professor(a). Verifique se todos os campos obrigatórios e tipos de dados estão corretos.",
      detalhe:
        process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// =========================================================================
// ATUALIZAR PROFESSOR
// =========================================================================
export const atualizarProfessor = async (req, res) => {
  const { id } = req.params;
  const professorId = Number(id);

  if (isNaN(professorId)) {
    return res
      .status(400)
      .json({ error: "O ID fornecido não é um número válido." });
  }

  const {
    despesas,
    movimentacoes,
    id: _id,
    criado_em,
    user_id,
    alunos_ids,
    ...camposValidos
  } = req.body;

  try {
    const professorAtualizado = await prisma.$transaction(async (tx) => {
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
            camposValidos.salario !== undefined &&
            camposValidos.salario !== null &&
            camposValidos.salario !== ""
              ? parseFloat(camposValidos.salario)
              : undefined,
          atualizado_em: new Date(),
        },
      });

      if (Array.isArray(alunos_ids)) {
        await tx.professores_alunos.deleteMany({
          where: { professor_id: professorId },
        });

        if (alunos_ids.length > 0) {
          await tx.professores_alunos.createMany({
            data: alunos_ids.map((alunoId) => ({
              professor_id: professorId,
              aluno_id: Number(alunoId),
            })),
          });
        }
      }

      return professor;
    });

    return res.status(200).json({
      message: "Professor(a) atualizado(a) com sucesso.",
      teacher: formatProfessorResponse(professorAtualizado),
    });
  } catch (error) {
    console.error(
      `❌ [ATUALIZAR_PROFESSOR] Erro ao atualizar professor ID ${professorId}:`,
    );
    console.error("   Mensagem:", error.message);
    console.error("   Código do Erro (Prisma):", error.code);

    return res
      .status(500)
      .json({ error: "Erro ao atualizar professor(a) no banco de dados." });
  }
};

// =========================================================================
// DELETAR PROFESSOR
// =========================================================================
export const deletarProfessor = async (req, res) => {
  const { id } = req.params;
  const professorId = Number(id);

  if (isNaN(professorId)) {
    console.warn(`⚠️ [DELETAR_PROFESSOR] ID inválido fornecido: "${id}"`);
    return res
      .status(400)
      .json({ error: "O ID fornecido não é um número válido." });
  }

  try {
    const professor = await prisma.professores.findUnique({
      where: { id: professorId },
      select: { user_id: true },
    });

    if (!professor) {
      return res
        .status(404)
        .json({ message: "Professor(a) não encontrado(a)." });
    }

    if (professor.user_id) {
      await prisma.users.delete({
        where: { id: professor.user_id },
      });
    } else {
      await prisma.professores.delete({
        where: { id: professorId },
      });
    }

    console.log(
      `✅ [DELETAR_PROFESSOR] Professor ID ${professorId} excluído com sucesso.`,
    );
    return res.status(200).json({
      message:
        "Professor(a) e suas credenciais de acesso foram removidos com sucesso.",
    });
  } catch (error) {
    console.error(
      `❌ [DELETAR_PROFESSOR] Erro ao deletar professor ID ${professorId}:`,
      error,
    );
    return res.status(500).json({ error: "Erro ao deletar professor(a)." });
  }
};
