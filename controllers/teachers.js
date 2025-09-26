import * as Model from "../models/teachers.js";
import * as DespesaModel from "../models/despesas.js";
const table = "professores";

// Utilitário simples para formatar datas (opcional)
const formatDates = (professor) => {
  if (!professor) return professor;
  return {
    ...professor,
    dataNascimento: professor.dataNascimento?.toISOString().split("T")[0],
    dataMatricula: professor.dataMatricula?.toISOString().split("T")[0],
    criado_em: professor.criado_em?.toISOString(),
    atualizado_em: professor.atualizado_em?.toISOString(),
  };
};

//? LISTAR TODOS OS PROFESSORES
export const listarProfessores = async (req, res) => {
  try {
    const professores = await Model.getTeachersAll(table);
    res.status(200).json(professores.map(formatDates));
  } catch (error) {
    console.error("❌ Erro ao listar professores:", error.message);
    res.status(500).json({ error: "Erro ao buscar professores" });
  }
};

//? BUSCAR PROFESSOR POR ID
export const listarProfessoresID = async (req, res) => {
  try {
    const { id } = req.params;
    const professorRows = await Model.getTeachersById(table, id);

    if (!professorRows || professorRows.length === 0) {
      return res.status(404).json({ message: "Professor não encontrado!" });
    }

    const professor = professorRows[0]; // 👈 pega só o objeto
    const movimentacoes = await DespesaModel.getDespesaByProfessorId(
      "despesas",
      id
    );

    res.json({
      ...professor,
      movimentacoes: movimentacoes.map((m) => ({
        ...m,
        data_pagamento: m.data_pagamento
          ? new Date(m.data_pagamento).toISOString().split("T")[0]
          : null,
      })),
    });
  } catch (error) {
    console.error("❌ Erro ao buscar professor:", error.message);
    res.status(500).json({ error: "Erro ao buscar professor" });
  }
};

//? CRIAR PROFESSOR
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

    const newTeacher = await Model.createTeacher(
      table,
      [
        "nome",
        "data_nascimento",
        "telefone",
        "endereco",
        "data_contratacao",
        "nivel_ensino",
        "turno",
        "salario",
        "status",
      ],
      [
        nome,
        data_nascimento,
        telefone,
        endereco,
        data_contratacao,
        nivel_ensino,
        turno,
        salario,
        status,
      ]
    );

    res.status(201).json({
      message: "Professor(a) cadastrado com sucesso.",
      teacher: formatDates(newTeacher),
    });
  } catch (error) {
    console.error("❌ Erro ao inserir professor(a): ", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar professor(a)." });
  }
};

//? ATUALIZAR PROFESSOR
export const atualizarProfessor = async (req, res) => {
  try {
    const { id } = req.params;
    const professorExistente = await Model.getTeachersById(table, id);
    if (!professorExistente || professorExistente.length === 0) {
      return res.status(404).json({ message: "Professor(a) não encontrado." });
    }

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

    const professorAtualizado = await Model.updateTeacher(table, id, {
      nome: nome?.trim() || "",
      data_nascimento: data_nascimento || "",
      telefone: telefone || "",
      endereco: endereco?.trim() || "",
      data_contratacao: data_contratacao || "",
      nivel_ensino: nivel_ensino?.trim() || "",
      turno: turno?.trim() || "",
      salario: salario || "",
      status: status?.trim() || "ativo",
    });
    res.status(200).json({
      message: "Professor(a) atualizado com sucesso",
      teacher: formatDates(professorAtualizado),
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar professor(a): ", error.message);
    res.status(500).json({ error: " Erro ao atualizar professor(a) no banco" });
  }
};

//? DELETAR PROFESSOR
export const deletarProfessor = async (req, res) => {
  try {
    const { id } = req.params;
    const professorDeletado = await Model.deleteTeacher(table, id);

    if (!professorDeletado) {
      return res
        .status(404)
        .json({ message: "Professor(a) não encontrado para exclusão" });
    }
    res.status(200).json({
      message: "Professor(a) deletado com sucesso",
      teacher: formatDates(professorDeletado),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar professor(a):", error.message);
    res.status(500).json({ error: "Erro ao deletar professor(a) no banco" });
  }
};
