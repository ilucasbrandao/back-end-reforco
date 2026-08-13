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
  console.log(
    "🔍 [LISTAR_PROFESSORES] Iniciando busca de todos os professores...",
  );
  try {
    const professores = await prisma.professores.findMany({
      orderBy: { nome: "asc" },
      include: {
        user: {
          select: { email: true, role: true },
        },
      },
    });

    console.log(
      `✅ [LISTAR_PROFESSORES] Sucesso: ${professores.length} professor(es) encontrado(s).`,
    );
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

  console.log(`🔍 [BUSCAR_PROFESSOR_ID] Buscando professor ID: ${id}`);

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
      console.warn(
        `⚠️ [BUSCAR_PROFESSOR_ID] Professor ID ${professorId} não encontrado no banco.`,
      );
      return res
        .status(404)
        .json({ message: "Professor(a) não encontrado(a)!" });
    }

    const alunos = professor.professores_alunos.map((item) => item.aluno);
    const movimentacoes = professor.despesas.map((d) => ({
      ...d,
      data_pagamento: formatDateOnly(d.data_pagamento),
    }));

    console.log(
      `✅ [BUSCAR_PROFESSOR_ID] Sucesso ao carregar dados do professor ID: ${professorId}`,
    );
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

  console.log("📥 [CADASTRO_PROFESSOR] Recebendo requisição de cadastro:");
  console.log(
    "   Payload:",
    JSON.stringify({ nome, email, data_nascimento, turno, alunos_ids }),
  );

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Step 1: Verificar se o e-mail já está cadastrado
      console.log(
        `🔎 [CADASTRO_PROFESSOR - Passo 1] Checando existência do e-mail: ${email}`,
      );
      const userExistente = await tx.users.findUnique({
        where: { email },
      });

      if (userExistente) {
        console.warn(
          `⚠️ [CADASTRO_PROFESSOR - Passo 1] E-mail já em uso por ID: ${userExistente.id}`,
        );
        throw new Error("EMAIL_EXISTS");
      }

      // Step 2: Gerar senha inicial e hash
      console.log(
        "🔑 [CADASTRO_PROFESSOR - Passo 2] Gerando senha inicial e Hash BCrypt...",
      );
      const senhaLimpa = generateDefaultPassword(data_nascimento);
      const senhaHash = await hashPassword(senhaLimpa);

      // Step 3: Criar conta na tabela 'users'
      console.log(
        "👤 [CADASTRO_PROFESSOR - Passo 3] Inserindo registro na tabela 'users'...",
      );
      const novoUsuario = await tx.users.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          role: "professor",
        },
      });
      console.log(`   └ User criado com sucesso - ID: ${novoUsuario.id}`);

      // Step 4: Criar o perfil na tabela 'professores'
      console.log(
        "🎓 [CADASTRO_PROFESSOR - Passo 4] Inserindo registro na tabela 'professores'...",
      );
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
        console.log(
          `🔗 [CADASTRO_PROFESSOR - Passo 5] Criando vínculos na tabela 'professores_alunos' para ${alunos_ids.length} aluno(s)...`,
        );
        const vinculos = alunos_ids.map((alunoId) => ({
          professor_id: novoProfessor.id,
          aluno_id: Number(alunoId),
        }));

        await tx.professores_alunos.createMany({
          data: vinculos,
        });
        console.log("   └ Vínculos criados com sucesso.");
      } else {
        console.log(
          "ℹ️ [CADASTRO_PROFESSOR - Passo 5] Nenhum aluno para vincular inicialmente.",
        );
      }

      return { novoProfessor, senhaLimpa };
    });

    console.log(
      `🎉 [CADASTRO_PROFESSOR] Cadastro finalizado com sucesso! Professor ID: ${resultado.novoProfessor.id}`,
    );

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

  console.log(`📝 [ATUALIZAR_PROFESSOR] Atualizando professor ID: ${id}`);

  if (isNaN(professorId)) {
    console.warn(`⚠️ [ATUALIZAR_PROFESSOR] ID inválido fornecido: "${id}"`);
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
      console.log(
        `⚙️ [ATUALIZAR_PROFESSOR] Atualizando dados na tabela 'professores' ID: ${professorId}...`,
      );

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
        console.log(
          `🔄 [ATUALIZAR_PROFESSOR] Atualizando vínculos de alunos para o professor ID: ${professorId}...`,
        );

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

    console.log(
      `✅ [ATUALIZAR_PROFESSOR] Sucesso ao atualizar o professor ID: ${professorId}`,
    );
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

  console.log(
    `🗑️ [DELETAR_PROFESSOR] Tentativa de remoção do professor ID: ${id}`,
  );

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
      console.warn(
        `⚠️ [DELETAR_PROFESSOR] Professor ID ${professorId} não encontrado para deleção.`,
      );
      return res
        .status(404)
        .json({ message: "Professor(a) não encontrado(a)." });
    }

    if (professor.user_id) {
      console.log(
        `👤 [DELETAR_PROFESSOR] Removendo registro de acesso na tabela 'users' ID: ${professor.user_id}...`,
      );
      await prisma.users.delete({
        where: { id: professor.user_id },
      });
    } else {
      console.log(
        `🎓 [DELETAR_PROFESSOR] Removendo registro na tabela 'professores' ID: ${professorId}...`,
      );
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
