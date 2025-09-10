import * as Model from "../models/students.js";
import moment from "moment";

const table = "alunos";

// Listar todos os alunos
export const getStudentsAll = async (req, res) => {
  try {
    const alunos = await Model.getStudentsAll(table);
    const alunosFormatados = alunos.map((aluno) => ({
      ...aluno,
      dataNascimento: aluno.dataNascimento
        ? moment(aluno.dataNascimento).format("DD/MM/YYYY")
        : "",
      dataMatricula: aluno.dataMatricula
        ? moment(aluno.dataMatricula).format("DD/MM/YYYY")
        : "",
      create_time: aluno.create_time
        ? moment(aluno.create_time).format("DD/MM/YYYY")
        : "",
      update_time: aluno.update_time
        ? moment(aluno.update_time).format("DD/MM/YYYY")
        : "",
    }));
    res.status(200).json(alunosFormatados);
  } catch (error) {
    console.error("❌ Erro ao listar alunos:", error.message);
    res.status(500).json({ error: "Erro ao buscar alunos" });
  }
};

// Buscar aluno por ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const aluno = await Model.getStudentById(table, id);
    if (!aluno)
      return res.status(404).json({ message: "Aluno não encontrado!" });

    const alunoFormatado = {
      ...aluno,
      dataNascimento: aluno.dataNascimento
        ? moment(aluno.dataNascimento).format("DD/MM/YYYY")
        : "",
      dataMatricula: aluno.dataMatricula
        ? moment(aluno.dataMatricula).format("DD/MM/YYYY")
        : "",
      create_time: aluno.create_time
        ? moment(aluno.create_time).format("DD/MM/YYYY")
        : "",
      update_time: aluno.update_time
        ? moment(aluno.update_time).format("DD/MM/YYYY")
        : "",
    };

    res.json(alunoFormatado);
  } catch (error) {
    console.error("❌ Erro ao buscar aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};

// Criar aluno
export const createStudent = async (req, res) => {
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

    const nascimentoBD = dataNascimento
      ? moment(dataNascimento, "DD/MM/YYYY").toDate()
      : null;
    const matriculaBD = dataMatricula
      ? moment(dataMatricula, "DD/MM/YYYY").toDate()
      : null;

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
        nascimentoBD,
        responsavel,
        telefone,
        matriculaBD,
        serie,
        observacao || "",
        situacao,
      ]
    );

    const newStudent = await Model.getStudentById(table, insertId);

    const alunoFormatado = {
      ...newStudent,
      dataNascimento: newStudent.dataNascimento
        ? moment(newStudent.dataNascimento).format("DD/MM/YYYY")
        : "",
      dataMatricula: newStudent.dataMatricula
        ? moment(newStudent.dataMatricula).format("DD/MM/YYYY")
        : "",
      create_time: newStudent.create_time
        ? moment(newStudent.create_time).format("DD/MM/YYYY")
        : "",
      update_time: newStudent.update_time
        ? moment(newStudent.update_time).format("DD/MM/YYYY")
        : "",
    };

    res.status(201).json({
      message: "Aluno cadastrado com sucesso",
      student: alunoFormatado,
    });
  } catch (error) {
    console.error("❌ Erro ao inserir aluno:", error.message);
    res.status(500).json({ error: "Erro ao inserir aluno no banco" });
  }
};
