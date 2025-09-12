import * as Model from "../models/students.js";
import moment from "moment";
import { pool } from "../db.js";

const table = "alunos";

// ------------------ ROTA POST ------------------ //
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

    const situacaoFinal = situacao || "ativo";

    // Validação de campos obrigatórios
    if (!name || !dataNascimento || !dataMatricula || !serie) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // Validação de formato e datas futuras
    const hoje = moment().startOf("day");

    const nascimentoBD = moment(dataNascimento, "YYYY-MM-DD");
    const matriculaBD = moment(dataMatricula, "YYYY-MM-DD");

    if (!nascimentoBD.isValid() || !matriculaBD.isValid()) {
      return res.status(400).json({ error: "Formato de data inválido." });
    }

    if (nascimentoBD.isAfter(hoje)) {
      return res
        .status(400)
        .json({ error: "Data de nascimento não pode ser futura." });
    }

    if (matriculaBD.isAfter(hoje)) {
      return res
        .status(400)
        .json({ error: "Data de matrícula não pode ser futura." });
    }

    // Verificação de duplicidade
    const [existing] = await pool.query(
      `SELECT * FROM alunos WHERE LOWER(name) = LOWER(?) AND LOWER(responsavel) = LOWER(?)`,
      [name, responsavel]
    );

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: "Aluno já cadastrado com esse responsável." });
    }

    // Inserção no banco
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
        nascimentoBD.toDate(),
        responsavel,
        telefone,
        matriculaBD.toDate(),
        serie,
        observacao || "",
        situacaoFinal,
      ]
    );

    const [newStudent] = await Model.getStudentById(table, insertId);

    // Formatação da resposta
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

    console.log("📦 Dados para inserção:", {
      name,
      nascimentoBD: nascimentoBD.toDate(),
      responsavel,
      telefone,
      matriculaBD: matriculaBD.toDate(),
      serie,
      observacao,
      situacaoFinal,
    });

    res.status(201).json({
      message: "Aluno cadastrado com sucesso",
      student: alunoFormatado,
    });
  } catch (error) {
    console.error("❌ Erro ao inserir aluno:", error.message);
    console.error("📄 Stack:", error.stack);
    res.status(500).json({ error: "Erro ao inserir aluno no banco" });
  }
};

// ------------------ ROTA GET ALL ------------------ //
export const getStudentsAll = async (req, res) => {
  try {
    const students = await Model.getStudentsAll(table);
    const formatted = students.map((s) => ({
      ...s,
      dataNascimento: s.dataNascimento
        ? moment(s.dataNascimento).format("DD/MM/YYYY")
        : "",
      dataMatricula: s.dataMatricula
        ? moment(s.dataMatricula).format("DD/MM/YYYY")
        : "",
      create_time: s.create_time
        ? moment(s.create_time).format("DD/MM/YYYY")
        : "",
      update_time: s.update_time
        ? moment(s.update_time).format("DD/MM/YYYY")
        : "",
    }));
    res.status(200).json(formatted);
  } catch (err) {
    console.error("❌ Erro ao listar alunos:", err);
    res.status(500).json({ error: "Erro ao listar alunos" });
  }
};

// ------------------ ROTA GET BY ID ------------------ //
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Model.getStudentById(table, id);
    if (!student)
      return res.status(404).json({ error: "Aluno não encontrado" });

    const formatted = {
      ...student,
      dataNascimento: student.dataNascimento
        ? moment(student.dataNascimento).format("DD/MM/YYYY")
        : "",
      dataMatricula: student.dataMatricula
        ? moment(student.dataMatricula).format("DD/MM/YYYY")
        : "",
      create_time: student.create_time
        ? moment(student.create_time).format("DD/MM/YYYY")
        : "",
      update_time: student.update_time
        ? moment(student.update_time).format("DD/MM/YYYY")
        : "",
    };

    res.status(200).json(formatted);
  } catch (err) {
    console.error("❌ Erro ao buscar aluno:", err);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};
