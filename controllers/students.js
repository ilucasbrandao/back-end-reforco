import * as Model from "../models/students.js";
import * as MensalidadeModel from "../models/mensalidade.js";
import { pool } from "../db.js";
import bcrypt from "bcrypt";

const table = "alunos";

// =========================================================================
// FUNÇÕES AUXILIARES (DATAS)
// =========================================================================

// Corrige fuso para exibir data local no formato YYYY-MM-DD
function formatLocalDate(date) {
  if (!date) return null;
  // PostgreSQL já retorna 'YYYY-MM-DD' para campos DATE
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
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
    const alunos = await Model.getStudentsAll(table);
    res.status(200).json(alunos.map(formatDates));
  } catch (error) {
    console.error("❌ Erro ao listar alunos:", error.message);
    res.status(500).json({ error: "Erro ao buscar alunos" });
  }
};

// Buscar aluno por ID
export const getAlunoComMovimentacoes = async (req, res) => {
  try {
    const { id } = req.params;
    const aluno = await Model.getStudentById(table, id);
    const movimentacoes = await MensalidadeModel.getMensalidadesByAlunoId(
      "receitas",
      id
    );

    if (!aluno)
      return res.status(404).json({ message: "Aluno não encontrado!" });

    // --- NOVO: BUSCAR DADOS DE ACESSO (PLANO E EMAIL) ---
    // Fazemos uma query direta para saber se tem responsável vinculado
    const dadosAcesso = await pool.query(
      `SELECT u.email, u.plano 
       FROM users u
       JOIN responsaveis_alunos ra ON ra.responsavel_id = u.id
       WHERE ra.aluno_id = $1`,
      [id]
    );

    const acesso = dadosAcesso.rows[0] || { plano: "basico", email: "" };
    // ----------------------------------------------------

    res.json({
      ...aluno,
      // Injetamos essas infos para o Front usar no formulário de edição
      plano: acesso.plano,
      email_responsavel: acesso.email,
      movimentacoes: movimentacoes.map((m) => ({
        ...m,
        data_pagamento: m.data_pagamento
          ? new Date(m.data_pagamento).toISOString().split("T")[0]
          : null,
      })),
    });
  } catch (error) {
    console.error("❌ Erro ao buscar aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};

// Criar aluno (COM LÓGICA INTELIGENTE DE PLANO PREMIUM)
export const cadastrar = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      // Dados do Aluno
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
    } = req.body;

    // --- INÍCIO DA TRANSAÇÃO (Tudo ou Nada) ---
    await client.query("BEGIN");

    // 1. INSERIR O ALUNO NA TABELA 'ALUNOS'
    const insertAlunoQuery = `
      INSERT INTO alunos (nome, data_nascimento, responsavel, telefone, data_matricula, valor_mensalidade, serie, turno, observacao, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const valuesAluno = [
      nome,
      data_nascimento,
      responsavel,
      telefone,
      data_matricula,
      valor_mensalidade === "" || valor_mensalidade == null
        ? null
        : parseFloat(valor_mensalidade),
      serie,
      turno,
      observacao,
      status,
    ];

    const alunoResult = await client.query(insertAlunoQuery, valuesAluno);
    const novoAluno = alunoResult.rows[0];

    // 2. LÓGICA DO PLANO PREMIUM (Cria Usuário e Vincula)
    let dadosAcesso = null;

    if (plano === "premium") {
      if (!email_responsavel) {
        throw new Error(
          "Para o plano Premium, o email do responsável é obrigatório."
        );
      }

      // A. Verificar se o pai já tem cadastro (pelo email)
      const userCheck = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email_responsavel]
      );
      let userId;

      if (userCheck.rows.length > 0) {
        // Pai já existe (tem outro filho). Usamos o mesmo ID.
        userId = userCheck.rows[0].id;

        // Opcional: Atualiza o plano do pai para premium se ele era básico
        await client.query("UPDATE users SET plano = 'premium' WHERE id = $1", [
          userId,
        ]);
      } else {
        // B. Criar Senha Padrão baseada na Data de Nascimento do aluno
        // Ex: 2025-12-12 vira "20251212"
        let senhaLimpa = "123456"; // Senha fallback
        if (data_nascimento) {
          senhaLimpa = data_nascimento.toString().replace(/[^0-9]/g, ""); // Remove traços
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senhaLimpa, salt);

        // C. Inserir na tabela USERS
        const insertUserQuery = `
          INSERT INTO users (nome, email, senha, role, plano)
          VALUES ($1, $2, $3, 'responsavel', 'premium') 
          RETURNING id
      `;
        const userResult = await client.query(insertUserQuery, [
          responsavel,
          email_responsavel,
          senhaHash,
        ]);
        userId = userResult.rows[0].id;
      }

      // D. Criar o VÍNCULO (Responsaveis_Alunos)
      await client.query(
        "INSERT INTO responsaveis_alunos (responsavel_id, aluno_id, parentesco) VALUES ($1, $2, $3)",
        [userId, novoAluno.id, "Responsável"]
      );

      dadosAcesso = {
        email: email_responsavel,
        msg: "Acesso Premium criado!",
      };
    }

    // --- FIM DA TRANSAÇÃO ---
    await client.query("COMMIT");

    console.log("Data de matrícula recebida:", data_matricula);

    res.status(201).json({
      message: "Aluno cadastrado com sucesso.",
      student: formatDates(novoAluno),
      acesso: dadosAcesso, // Retorna info se criou acesso ou não
    });
  } catch (error) {
    await client.query("ROLLBACK"); // Cancela tudo se der erro
    console.error("❌ Erro ao inserir aluno:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Erro interno ao cadastrar aluno." });
  } finally {
    client.release(); // Libera conexão
  }
};

// Atualizar aluno
export const atualizar = async (req, res) => {
  const client = await pool.connect(); // Precisamos de transação

  try {
    const { id } = req.params;

    // --- INÍCIO DA TRANSAÇÃO ---
    await client.query("BEGIN");

    const alunoExistente = await Model.getStudentById(table, id);
    if (!alunoExistente) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Aluno não encontrado." });
    }

    const {
      // Dados Aluno
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
      // Dados de Acesso (Upgrade)
      plano,
      email_responsavel,
    } = req.body;

    // 1. Atualizar dados do ALUNO (Tabela alunos)
    const data = {};
    if (nome !== undefined) data.nome = nome.trim();
    if (data_nascimento !== undefined) data.data_nascimento = data_nascimento;
    if (responsavel !== undefined) data.responsavel = responsavel.trim();
    if (telefone !== undefined) data.telefone = telefone;
    if (data_matricula !== undefined) data.data_matricula = data_matricula;
    if (valor_mensalidade !== undefined) {
      data.valor_mensalidade =
        valor_mensalidade === "" || valor_mensalidade == null
          ? null
          : parseFloat(valor_mensalidade);
    }
    if (serie !== undefined) data.serie = serie.trim();
    if (turno !== undefined) data.turno = turno.trim();
    if (observacao !== undefined) data.observacao = observacao;
    if (status !== undefined) data.status = status.trim();

    // Chama o Model antigo para atualizar a tabela de alunos
    const alunoAtualizado = await Model.updateStudent(table, id, data);

    // 2. LÓGICA DE ATUALIZAÇÃO DO PLANO (Tabela users)
    if (plano) {
      // A. Descobrir quem é o responsável por este aluno
      const vinculo = await client.query(
        "SELECT responsavel_id FROM responsaveis_alunos WHERE aluno_id = $1",
        [id]
      );

      let userId = null;

      if (vinculo.rows.length > 0) {
        // CENÁRIO 1: Já existe um vínculo, vamos atualizar esse usuário
        userId = vinculo.rows[0].responsavel_id;

        if (plano === "premium") {
          // Se virou Premium, atualizamos email e plano
          if (email_responsavel) {
            await client.query(
              "UPDATE users SET plano = 'premium', email = $1 WHERE id = $2",
              [email_responsavel, userId]
            );
          } else {
            await client.query(
              "UPDATE users SET plano = 'premium' WHERE id = $1",
              [userId]
            );
          }
        } else {
          // Se virou Básico (Downgrade), só muda o plano (não apaga o user pra manter histórico)
          await client.query(
            "UPDATE users SET plano = 'basico' WHERE id = $1",
            [userId]
          );
        }
      } else if (plano === "premium" && email_responsavel) {
        // CENÁRIO 2: Aluno existe, virou Premium, mas NÃO tinha login ainda.
        // Precisamos criar o usuário do zero (Igual no Cadastrar)

        // Verifica se email já existe
        const userCheck = await client.query(
          "SELECT id FROM users WHERE email = $1",
          [email_responsavel]
        );

        if (userCheck.rows.length > 0) {
          // Pai já tem conta, só vincula
          userId = userCheck.rows[0].id;
          await client.query(
            "UPDATE users SET plano = 'premium' WHERE id = $1",
            [userId]
          );
        } else {
          // Cria novo User
          let senhaLimpa = "123456";
          // Tenta pegar a data de nascimento do body ou do aluno existente
          const dNasc = data_nascimento || alunoExistente.data_nascimento;
          if (dNasc) {
            senhaLimpa = dNasc.toString().replace(/[^0-9]/g, ""); // Apenas números
          }

          const salt = await bcrypt.genSalt(10);
          const senhaHash = await bcrypt.hash(senhaLimpa, salt);

          const newUser = await client.query(
            `INSERT INTO users (nome, email, senha, role, plano) 
                    VALUES ($1, $2, $3, 'responsavel', 'premium') RETURNING id`,
            [
              responsavel || alunoExistente.responsavel,
              email_responsavel,
              senhaHash,
            ]
          );
          userId = newUser.rows[0].id;
        }

        // Cria o Vínculo que faltava
        await client.query(
          "INSERT INTO responsaveis_alunos (responsavel_id, aluno_id, parentesco) VALUES ($1, $2, 'Responsável')",
          [userId, id]
        );
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      message: "Aluno atualizado com sucesso",
      student: formatDates(alunoAtualizado),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao atualizar aluno:", error.message);
    res.status(500).json({ error: "Erro ao atualizar aluno no banco" });
  } finally {
    client.release();
  }
};

// Deletar aluno
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const alunoDeletado = await Model.deleteStudent(table, id);

    if (!alunoDeletado) {
      return res
        .status(404)
        .json({ message: "Aluno não encontrado para exclusão." });
    }

    res.status(200).json({
      message: "Aluno deletado com sucesso",
      student: formatDates(alunoDeletado),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar aluno:", error.message);
    res.status(500).json({ error: "Erro ao deletar aluno no banco" });
  }
};

// =========================================================================
// ROTA EXTRA: GERAR ACESSO MANUALMENTE (Para alunos antigos)
// =========================================================================
export const criarAcessoPai = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // ID Aluno
    const { nome, email, senha, plano, parentesco } = req.body;

    if (!email || !senha)
      return res.status(400).json({ message: "Email e senha obrigatórios." });
    if (!["basico", "premium"].includes(plano))
      return res.status(400).json({ message: "Plano inválido." });

    await client.query("BEGIN");

    // Verifica usuário
    const userCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    let usuarioId;

    if (userCheck.rows.length > 0) {
      usuarioId = userCheck.rows[0].id;
      // Atualiza para premium se necessário
      if (plano === "premium") {
        await client.query("UPDATE users SET plano = 'premium' WHERE id = $1", [
          usuarioId,
        ]);
      }
    } else {
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);
      const novoUser = await client.query(
        `INSERT INTO users (nome, email, senha, role, plano) VALUES ($1, $2, $3, 'responsavel', $4) RETURNING id`,
        [nome, email, senhaHash, plano]
      );
      usuarioId = novoUser.rows[0].id;
    }

    // Cria vínculo
    const vinculoCheck = await client.query(
      "SELECT id FROM responsaveis_alunos WHERE responsavel_id = $1 AND aluno_id = $2",
      [usuarioId, id]
    );
    if (vinculoCheck.rows.length === 0) {
      await client.query(
        "INSERT INTO responsaveis_alunos (responsavel_id, aluno_id, parentesco) VALUES ($1, $2, $3)",
        [usuarioId, id, parentesco || "Responsável"]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Acesso criado/atualizado com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao criar acesso." });
  } finally {
    client.release();
  }
};
