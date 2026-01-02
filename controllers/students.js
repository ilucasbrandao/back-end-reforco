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
  // PostgreSQL já retorna 'YYYY-MM-DD' para campos DATE, mas garantimos aqui
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  // Ajusta para o fuso local antes de extrair a data
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

const formatDates = (aluno) => {
  if (!aluno) return aluno;
  return {
    ...aluno,
    data_nascimento: formatLocalDate(aluno.data_nascimento),
    data_matricula: formatLocalDate(aluno.data_matricula),
    // Formata datas de timestamp para exibição amigável
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
    // Mapeia os alunos formatando as datas antes de enviar
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

    if (!aluno) {
      return res.status(404).json({ message: "Aluno não encontrado!" });
    }

    const movimentacoes = await MensalidadeModel.getMensalidadesByAlunoId(
      "receitas",
      id
    );

    // --- BUSCAR DADOS DE ACESSO (PLANO E EMAIL) ---
    // Busca dados do usuário responsável vinculado ao aluno
    const dadosAcesso = await pool.query(
      `SELECT u.email, u.plano 
       FROM users u
       JOIN responsaveis_alunos ra ON ra.responsavel_id = u.id
       WHERE ra.aluno_id = $1`,
      [id]
    );

    // Se não encontrar, define valores padrão
    const acesso = dadosAcesso.rows[0] || { plano: "basico", email: "" };

    // Se o plano no banco de dados do aluno for diferente do usuário (inconsistência), prioriza o do usuário ou o do aluno?
    // Aqui estamos assumindo que a tabela 'alunos' também tem uma coluna 'plano' para redundância/facilidade
    // Mas a fonte da verdade para acesso é a tabela 'users'.
    // Vamos enviar o plano que está na tabela alunos, mas se não tiver, usa o do user.
    const planoFinal = aluno.plano || acesso.plano || "padrao";

    res.json({
      ...formatDates(aluno), // Formata datas do aluno também
      plano: planoFinal,
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
      // Dados de Acesso
      plano,
      email_responsavel,
    } = req.body;

    // Validação básica para plano premium
    if (plano === "premium" && !email_responsavel) {
      return res.status(400).json({
        error: "Para o plano Premium, o email do responsável é obrigatório.",
      });
    }

    // --- INÍCIO DA TRANSAÇÃO (Tudo ou Nada) ---
    await client.query("BEGIN");

    // 1. INSERIR O ALUNO NA TABELA 'ALUNOS'
    // Adicionei 'plano' na query de insert para manter a info na tabela de alunos também
    const insertAlunoQuery = `
      INSERT INTO alunos (nome, data_nascimento, responsavel, telefone, data_matricula, valor_mensalidade, serie, turno, observacao, status, plano)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      status || "ativo", // Default status
      plano || "padrao", // Default plano
    ];

    const alunoResult = await client.query(insertAlunoQuery, valuesAluno);
    const novoAluno = alunoResult.rows[0];

    // 2. LÓGICA DO PLANO PREMIUM (Cria Usuário e Vincula)
    let dadosAcesso = null;

    if (plano === "premium") {
      // A. Verificar se o pai já tem cadastro (pelo email)
      const userCheck = await client.query(
        "SELECT id, plano FROM users WHERE email = $1",
        [email_responsavel]
      );

      let userId;

      if (userCheck.rows.length > 0) {
        // Pai já existe (tem outro filho ou cadastro anterior). Usamos o mesmo ID.
        userId = userCheck.rows[0].id;
        const userPlano = userCheck.rows[0].plano;

        // Atualiza o plano do pai para premium se ele era básico (Upgrade de conta)
        if (userPlano !== "premium") {
          await client.query(
            "UPDATE users SET plano = 'premium' WHERE id = $1",
            [userId]
          );
        }
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

      // D. Criar o VÍNCULO (Responsaveis_Alunos) se ainda não existir para este aluno
      // (Embora seja novo aluno, é bom garantir)
      await client.query(
        "INSERT INTO responsaveis_alunos (responsavel_id, aluno_id, parentesco) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [userId, novoAluno.id, "Responsável"]
      );

      dadosAcesso = {
        email: email_responsavel,
        msg: "Acesso Premium criado/vinculado!",
      };
    }

    // --- FIM DA TRANSAÇÃO ---
    await client.query("COMMIT");

    console.log("Aluno cadastrado:", novoAluno.id);

    res.status(201).json({
      message: "Aluno cadastrado com sucesso.",
      student: formatDates(novoAluno),
      acesso: dadosAcesso,
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
      // Dados de Acesso (Upgrade/Downgrade)
      plano,
      email_responsavel,
    } = req.body;

    // --- INÍCIO DA TRANSAÇÃO ---
    await client.query("BEGIN");

    const alunoExistente = await Model.getStudentById(table, id);
    if (!alunoExistente) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Aluno não encontrado." });
    }

    // 1. Atualizar dados do ALUNO (Tabela alunos)
    // Prepara objeto de dados dinamicamente
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
    if (plano !== undefined) data.plano = plano; // Atualiza plano na tabela alunos também

    // Chama o Model antigo para atualizar a tabela de alunos
    // Nota: Model.updateStudent precisa suportar atualização parcial ou você precisa passar todos os campos
    // Aqui assumo que o seu Model lida bem com o objeto 'data'
    const alunoAtualizado = await Model.updateStudent(table, id, data);

    // 2. LÓGICA DE ATUALIZAÇÃO DO PLANO/USUÁRIO (Tabela users)
    if (plano) {
      // A. Descobrir se já existe um responsável vinculado
      const vinculo = await client.query(
        "SELECT responsavel_id FROM responsaveis_alunos WHERE aluno_id = $1",
        [id]
      );

      let userId = null;

      if (vinculo.rows.length > 0) {
        // CENÁRIO 1: Já existe um vínculo
        userId = vinculo.rows[0].responsavel_id;

        if (plano === "premium") {
          // UPGRADE: Atualizamos email (se fornecido) e plano
          if (email_responsavel) {
            await client.query(
              "UPDATE users SET plano = 'premium', email = $1 WHERE id = $2",
              [email_responsavel, userId]
            );
          } else {
            // Se não forneceu email, apenas garante que é premium
            await client.query(
              "UPDATE users SET plano = 'premium' WHERE id = $1",
              [userId]
            );
          }
        } else {
          // DOWNGRADE: Se virou Padrão/Básico
          // Opcional: Manter o usuário como 'basico' ou remover acesso?
          // Geralmente mantém como básico para histórico, mas sem acesso a features premium
          await client.query(
            "UPDATE users SET plano = 'basico' WHERE id = $1",
            [userId]
          );
        }
      } else if (plano === "premium") {
        // CENÁRIO 2: Aluno virou Premium, mas NÃO tinha vínculo (login) ainda.
        // Precisamos criar o usuário ou vincular a um existente

        if (!email_responsavel) {
          throw new Error(
            "Email do responsável é obrigatório para upgrade Premium."
          );
        }

        // Verifica se email já existe
        const userCheck = await client.query(
          "SELECT id FROM users WHERE email = $1",
          [email_responsavel]
        );

        if (userCheck.rows.length > 0) {
          // Pai já tem conta, vincula e garante premium
          userId = userCheck.rows[0].id;
          await client.query(
            "UPDATE users SET plano = 'premium' WHERE id = $1",
            [userId]
          );
        } else {
          // Cria novo User do zero
          let senhaLimpa = "123456";
          // Tenta pegar a data de nascimento atualizada ou a antiga
          const dNasc = data_nascimento || alunoExistente.data_nascimento;
          if (dNasc) {
            // Formata a data para remover caracteres não numéricos
            const dataStr =
              dNasc instanceof Date ? dNasc.toISOString().split("T")[0] : dNasc;
            senhaLimpa = dataStr.replace(/[^0-9]/g, "");
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

        // Cria o Vínculo
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
    res
      .status(500)
      .json({ error: error.message || "Erro ao atualizar aluno no banco" });
  } finally {
    client.release();
  }
};

// Deletar aluno
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    // Model deve lidar com a deleção (e idealmente com constraints de chave estrangeira via ON DELETE CASCADE no banco)
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

    // Validação básica de plano permitidos
    const planosValidos = ["basico", "padrao", "premium"];
    if (plano && !planosValidos.includes(plano))
      return res.status(400).json({ message: "Plano inválido." });

    await client.query("BEGIN");

    // Verifica usuário por email
    const userCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    let usuarioId;

    if (userCheck.rows.length > 0) {
      usuarioId = userCheck.rows[0].id;
      // Se usuário já existe, atualizamos o plano se for premium
      if (plano === "premium") {
        await client.query("UPDATE users SET plano = 'premium' WHERE id = $1", [
          usuarioId,
        ]);
      }
    } else {
      // Cria novo usuário
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);
      const novoUser = await client.query(
        `INSERT INTO users (nome, email, senha, role, plano) VALUES ($1, $2, $3, 'responsavel', $4) RETURNING id`,
        [nome, email, senhaHash, plano || "padrao"]
      );
      usuarioId = novoUser.rows[0].id;
    }

    // Cria vínculo (evita duplicidade)
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

// Listar APENAS os filhos do usuário logado
export const listarMeusFilhos = async (req, res) => {
  try {
    // Pega ID do responsável do token JWT (middleware auth)
    const idResponsavel = req.userId;

    if (!idResponsavel) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    // console.log("Buscando filhos para o Responsável ID:", idResponsavel);

    const query = `
      SELECT a.* FROM alunos a
      JOIN responsaveis_alunos ra ON a.id = ra.aluno_id
      WHERE ra.responsavel_id = $1
    `;

    const result = await pool.query(query, [idResponsavel]);

    res.status(200).json(result.rows.map(formatDates));
  } catch (error) {
    console.error("❌ Erro ao buscar meus filhos:", error.message);
    res.status(500).json({ error: "Erro ao buscar alunos vinculados." });
  }
};

export const atualizarFotoAluno = async (req, res) => {
  try {
    const { id } = req.params;
    const responsavelId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma foto enviada." });
    }

    // 🔐 Verifica se o aluno pertence ao responsável
    const vinculo = await pool.query(
      `
      SELECT 1
      FROM responsaveis_alunos
      WHERE aluno_id = $1 AND responsavel_id = $2
      `,
      [id, responsavelId]
    );

    if (vinculo.rowCount === 0) {
      return res
        .status(403)
        .json({ error: "Sem permissão para alterar este aluno." });
    }

    const fotoUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/alunos/fotos/${req.file.filename}`;

    await pool.query("UPDATE alunos SET foto_url = $1 WHERE id = $2", [
      fotoUrl,
      id,
    ]);

    res.status(200).json({ foto_url: fotoUrl });
  } catch (error) {
    console.error("❌ Erro ao atualizar foto do aluno:", error.message);
    res.status(500).json({ error: "Erro ao atualizar foto do aluno." });
  }
};
