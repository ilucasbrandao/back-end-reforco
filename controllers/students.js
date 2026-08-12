import bcrypt from "bcrypt";
import prisma from "../prisma.ts"; // ou "../prisma.js" conforme seu arquivo
import { generateDefaultPassword, hashPassword } from "../utils/password.js";

// =========================================================================
// FUNÇÕES AUXILIARES (DATAS)
// =========================================================================

function formatLocalDate(date) {
  if (!date) return null;
  const d = new Date(date);
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
// CONTROLLER
// =========================================================================

export const StudentController = {
  // 1. Listar todos os alunos (Incluindo vínculo com Professores)
  async listarAlunos(req, res, next) {
    try {
      const alunos = await prisma.alunos.findMany({
        orderBy: { id: "asc" },
        include: {
          professores_alunos: {
            include: {
              professor: true,
            },
          },
        },
      });
      return res.status(200).json(alunos.map(formatDates));
    } catch (error) {
      console.error("❌ Erro ao listar alunos:", error.message);
      return res.status(500).json({ error: "Erro ao buscar alunos" });
    }
  },

  // 2. Listar filhos do Responsável Logado (Incluindo vínculo com Professores)
  async listarMeusFilhos(req, res, next) {
    try {
      const idResponsavel = req.userId;
      if (!idResponsavel)
        return res.status(401).json({ error: "Não autenticado." });

      const alunos = await prisma.alunos.findMany({
        where: {
          responsaveis_alunos: {
            some: { responsavel_id: idResponsavel },
          },
        },
        include: {
          professores_alunos: {
            include: {
              professor: true,
            },
          },
        },
      });

      return res.status(200).json(alunos.map(formatDates));
    } catch (error) {
      console.error("❌ Erro ao listar meus filhos:", error.message);
      return res
        .status(500)
        .json({ error: "Erro ao buscar alunos vinculados." });
    }
  },

  // 3. Buscar aluno por ID com Movimentações, Responsáveis e Professores
  async getAlunoComMovimentacoes(req, res, next) {
    try {
      const { id } = req.params;

      const aluno = await prisma.alunos.findUnique({
        where: { id: parseInt(id) },
        include: {
          receitas: { orderBy: { data_pagamento: "desc" } },
          responsaveis_alunos: {
            include: { responsavel: true },
          },
          professores_alunos: {
            include: { professor: true },
          },
        },
      });

      if (!aluno) {
        return res.status(404).json({ message: "Aluno não encontrado!" });
      }

      const vinculo = aluno.responsaveis_alunos[0];
      const email_responsavel = vinculo?.responsavel?.email || "";
      const planoAcesso = vinculo?.responsavel?.plano || "basico";

      return res.json({
        ...formatDates(aluno),
        plano: aluno.plano || planoAcesso,
        email_responsavel,
        movimentacoes: aluno.receitas.map((m) => {
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
      return res.status(500).json({ error: "Erro ao buscar aluno" });
    }
  },

  // 4. Cadastrar Aluno
  async cadastrar(req, res, next) {
    const {
      nome,
      data_nascimento,
      responsavel,
      telefone,
      data_matricula,
      valor_mensalidade,
      serie,
      turno,
      horario_atendimento,
      observacao,
      status,
      plano,
      email_responsavel,
      dia_vencimento,
      professor_id,
    } = req.body;

    const cleanEmail = email_responsavel
      ? email_responsavel.trim().toLowerCase()
      : null;

    if (plano === "premium" && !cleanEmail) {
      return res
        .status(400)
        .json({ error: "E-mail obrigatório para plano Premium." });
    }

    try {
      const resultado = await prisma.$transaction(async (tx) => {
        // A. Criar o Aluno
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
            horario_atendimento,
            observacao,
            status: status || "ativo",
            plano: plano || "padrao",
            dia_vencimento: dia_vencimento ? String(dia_vencimento) : null,
          },
        });

        // B. Criar Vínculo na Tabela Pivô (professores_alunos)
        if (professor_id) {
          await tx.professores_alunos.create({
            data: {
              professor_id: parseInt(professor_id),
              aluno_id: novoAluno.id,
            },
          });
        }

        // C. Sincronização de Usuário Premium
        let dadosAcesso = null;
        if (plano === "premium" && cleanEmail) {
          let user = await tx.users.findUnique({
            where: { email: cleanEmail },
          });

          let ehNovoUsuario = false;

          if (user) {
            if (user.plano !== "premium") {
              await tx.users.update({
                where: { id: user.id },
                data: { plano: "premium" },
              });
            }
          } else {
            ehNovoUsuario = true;
            const senhaLimpa = generateDefaultPassword(data_nascimento);
            const senhaHash = await hashPassword(senhaLimpa);

            user = await tx.users.create({
              data: {
                nome: responsavel || "Responsável",
                email: cleanEmail,
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
            email: cleanEmail,
            msg: ehNovoUsuario
              ? "Acesso Premium ativo! Utilizador criado."
              : "Novo filho vinculado ao perfil existente!",
          };
        }

        return { novoAluno, dadosAcesso };
      });

      return res.status(201).json({
        message: "Aluno cadastrado com sucesso.",
        student: formatDates(resultado.novoAluno),
        acesso: resultado.dadosAcesso,
      });
    } catch (error) {
      console.error("❌ Erro ao cadastrar aluno:", error.message);
      return res
        .status(500)
        .json({ error: "Erro interno ao cadastrar aluno." });
    }
  },

  // 5. Atualizar Aluno (Com Sincronização de Professor)
  async atualizar(req, res, next) {
    const { id } = req.params;
    const alunoId = parseInt(id);

    const {
      id: _id,
      criado_em,
      atualizado_em,
      receitas,
      responsaveis_alunos,
      professores_alunos,
      movimentacoes,
      email_responsavel,
      professor_id,
      ...data
    } = req.body;

    const cleanEmail = email_responsavel
      ? email_responsavel.trim().toLowerCase()
      : null;

    try {
      const alunoAtualizado = await prisma.$transaction(async (tx) => {
        // A. Atualizar dados cadastrais do Aluno
        const updated = await tx.alunos.update({
          where: { id: alunoId },
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

        // B. Sincronizar o Professor na Tabela Pivô (professores_alunos)
        if (professor_id !== undefined) {
          // 1. Remove os vínculos anteriores deste aluno
          await tx.professores_alunos.deleteMany({
            where: { aluno_id: alunoId },
          });

          // 2. Se um novo professor foi selecionado, insere o novo vínculo
          if (professor_id) {
            await tx.professores_alunos.create({
              data: {
                professor_id: parseInt(professor_id),
                aluno_id: alunoId,
              },
            });
          }
        }

        // C. Sincronização do Plano Premium (Usuário do Pai)
        if (data.plano === "premium" && cleanEmail) {
          const vinculoExistente = await tx.responsaveis_alunos.findFirst({
            where: { aluno_id: alunoId },
            include: { responsavel: true },
          });

          if (vinculoExistente) {
            await tx.users.update({
              where: { id: vinculoExistente.responsavel_id },
              data: {
                email: cleanEmail,
                plano: "premium",
              },
            });
          } else {
            let user = await tx.users.findUnique({
              where: { email: cleanEmail },
            });

            if (!user) {
              const senhaLimpa = generateDefaultPassword(data.data_nascimento);
              const senhaHash = await hashPassword(senhaLimpa);

              user = await tx.users.create({
                data: {
                  nome: data.responsavel || updated.responsavel,
                  email: cleanEmail,
                  senha: senhaHash,
                  role: "responsavel",
                  plano: "premium",
                },
              });
            }

            await tx.responsaveis_alunos.create({
              data: {
                responsavel_id: user.id,
                aluno_id: updated.id,
                parentesco: "Responsável",
              },
            });
          }
        } else if (data.plano === "basico") {
          const vinculo = await tx.responsaveis_alunos.findFirst({
            where: { aluno_id: alunoId },
          });
          if (vinculo) {
            await tx.users.update({
              where: { id: vinculo.responsavel_id },
              data: { plano: "basico" },
            });
          }
        }

        return updated;
      });

      return res.status(200).json({
        message: "Aluno atualizado e vínculo do professor sincronizado!",
        student: formatDates(alunoAtualizado),
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar aluno:", error.message);
      return res
        .status(500)
        .json({ error: "Erro ao atualizar aluno e sincronizar dados." });
    }
  },

  // 6. Deletar Aluno
  async deletar(req, res, next) {
    try {
      const { id } = req.params;
      const deletado = await prisma.alunos.delete({
        where: { id: parseInt(id) },
      });
      return res.status(200).json({
        message: "Aluno deletado com sucesso",
        student: formatDates(deletado),
      });
    } catch (error) {
      console.error("❌ Erro ao deletar aluno:", error.message);
      return res
        .status(500)
        .json({ error: "Aluno não encontrado ou erro no banco." });
    }
  },

  // 7. Upload de Foto do Aluno
  async uploadFoto(req, res, next) {
    try {
      const { id } = req.params;
      const alunoId = parseInt(id);

      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma foto enviada." });
      }

      const fotoUrl = `${req.protocol}://${req.get("host")}/uploads/alunos/fotos/${req.file.filename}`;

      const alunoAtualizado = await prisma.alunos.update({
        where: { id: alunoId },
        data: { foto_url: fotoUrl },
      });

      return res.status(200).json(alunoAtualizado);
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      return res.status(500).json({ error: "Erro ao salvar foto." });
    }
  },
};
