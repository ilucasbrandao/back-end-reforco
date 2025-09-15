import * as Model from "../models/students.js";
import moment from "moment";
import { pool } from "../db.js";

const table = "alunos";

const formatDates = (aluno) => ({
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
});

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
export const listarAlunosID = async (req, res) => {
  try {
    const { id } = req.params;
    const [aluno] = await Model.getStudentById(table, id); // padronizado como array
    if (!aluno)
      return res.status(404).json({ message: "Aluno não encontrado!" });

    res.json(formatDates(aluno));
  } catch (error) {
    console.error("❌ Erro ao buscar aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};

// Criar aluno
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
    if (!name || !dataNascimento || !dataMatricula || !serie || !responsavel) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // Validação de datas
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

    res.status(201).json({
      message: "Aluno cadastrado com sucesso",
      student: formatDates(newStudent),
    });
  } catch (error) {
    console.error("❌ Erro ao inserir aluno:", error.message);
    res.status(500).json({ error: "Erro ao inserir aluno no banco" });
  }
};
