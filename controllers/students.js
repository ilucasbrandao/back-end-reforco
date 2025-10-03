import * as Model from "../models/students.js";
import * as MensalidadeModel from "../models/mensalidade.js";
const table = "alunos";

// Utilitário simples para formatar datas
// Corrige fuso para exibir data local no formato YYYY-MM-DD
function formatLocalDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // 👈 remove efeito UTC
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

//? Listar todos os alunos
export const listarAlunos = async (req, res) => {
  try {
    const alunos = await Model.getStudentsAll(table);
    res.status(200).json(alunos.map(formatDates));
  } catch (error) {
    console.error("❌ Erro ao listar alunos:", error.message);
    res.status(500).json({ error: "Erro ao buscar alunos" });
  }
};

//? Buscar aluno por ID
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

    res.json({
      ...aluno,
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

//! Criar aluno
export const cadastrar = async (req, res) => {
  try {
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
    } = req.body;

    const newStudent = await Model.createStudent(
      table,
      [
        "nome",
        "data_nascimento",
        "responsavel",
        "telefone",
        "data_matricula",
        "valor_mensalidade",
        "serie",
        "turno",
        "observacao",
        "status",
      ],
      [
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
      ]
    );
    console.log(
      "Data de matrícula recebida:",
      data_matricula,
      typeof data_matricula
    );

    res.status(201).json({
      message: "Aluno cadastrado com sucesso.",
      student: formatDates(newStudent),
    });
  } catch (error) {
    console.error("❌ Erro ao inserir aluno:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar aluno." });
  }
};

//! Atualizar aluno
export const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const alunoExistente = await Model.getStudentById(table, id);
    if (!alunoExistente) {
      return res.status(404).json({ message: "Aluno não encontrado." });
    }

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
    } = req.body;

    // Só monta o objeto com os campos enviados
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

    const alunoAtualizado = await Model.updateStudent(table, id, data);

    res.status(200).json({
      message: "Aluno atualizado com sucesso",
      student: formatDates(alunoAtualizado),
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar aluno:", error.message);
    res.status(500).json({ error: "Erro ao atualizar aluno no banco" });
  }
};

//! Deletar aluno
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
