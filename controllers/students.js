import * as Model from "../models/students.js";
import { pool } from "../db.js";

const table = "alunos";

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
export const listarAlunosID = async (req, res) => {
  try {
    const { id } = req.params;
    const [aluno] = await Model.getStudentById(table, id);
    if (!aluno)
      return res.status(404).json({ message: "Aluno não encontrado!" });

    res.json(formatDates(aluno));
  } catch (error) {
    console.error("❌ Erro ao buscar aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};

//! Criar aluno - back cru, sem validação
export const cadastrar = async (req, res) => {
  try {
    const {
      name,
      dataNascimento,
      responsavel,
      telefone,
      dataMatricula,
      serie,
      observacao,
      situacao,
    } = req.body;

    // Inserção direta, sem validação
    const { insertId } = await Model.createStudent(
      table,
      [
        "name",
        "dataNascimento",
        "responsavel",
        "telefone",
        "dataMatricula",
        "serie",
        "observacao",
        "situacao",
      ],
      [
        name,
        dataNascimento,
        responsavel,
        telefone,
        dataMatricula,
        serie,
        observacao,
        situacao,
      ]
    );

    const [newStudent] = await Model.getStudentById(table, insertId);

    res
      .status(201)
      .json({ message: "Aluno cadastrado com sucesso.", student: newStudent });
  } catch (error) {
    console.error("❌ Erro ao inserir aluno:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar aluno." });
  }
};

//! Atualizar aluno - back cru, sem validação
export const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const [alunoExistente] = await Model.getStudentById(table, id);
    if (!alunoExistente) {
      return res.status(404).json({ message: "Aluno não encontrado." });
    }

    const {
      name,
      dataNascimento,
      responsavel,
      telefone,
      dataMatricula,
      serie,
      observacao,
      situacao,
    } = req.body;

    // Atualização direta sem conversão ou validação
    await Model.updateStudent(table, id, {
      name: name?.trim() || "",
      dataNascimento: dataNascimento || "",
      responsavel: responsavel?.trim() || "",
      telefone: telefone || "",
      dataMatricula: dataMatricula || "",
      serie: serie?.trim() || "",
      observacao: observacao || "",
      situacao: situacao?.trim() || "ativo",
    });

    const [alunoAtualizado] = await Model.getStudentById(table, id);

    res.status(200).json({
      message: "Aluno atualizado com sucesso",
      student: alunoAtualizado,
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
    const result = await Model.deleteStudent(table, id);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Aluno não encontrado para exclusão." });
    }

    res.status(200).json({ message: "Aluno deletado com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao deletar aluno:", error.message);
    res.status(500).json({ error: "Erro ao deletar aluno no banco" });
  }
};
