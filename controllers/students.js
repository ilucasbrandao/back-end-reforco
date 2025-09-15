import * as Model from "../models/students.js";
import moment from "moment";
import { pool } from "../db.js";

const table = "alunos";

// Função auxiliar para converter a data do formato DD/MM/YYYY para o formato ISO 8601
// Essa é a melhor prática para armazenar no banco de dados
const toISO = (date) => {
  return moment(date, "DD/MM/YYYY").format("YYYY-MM-DD");
};

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
    const situacaoFinal = situacao || "ativo"; // Validação de campos obrigatórios

    if (!name || !dataNascimento || !dataMatricula || !serie || !responsavel) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    } // Validar e converter datas de entrada (DD/MM/YYYY)

    const nascimento = moment(dataNascimento, "DD/MM/YYYY");
    const matricula = moment(dataMatricula, "DD/MM/YYYY");
    const hoje = moment().startOf("day");
    if (!nascimento.isValid() || !matricula.isValid()) {
      return res
        .status(400)
        .json({ error: "Formato de data inválido. Use DD/MM/YYYY." });
    }
    if (nascimento.isAfter(hoje)) {
      return res
        .status(400)
        .json({ error: "Data de nascimento não pode ser futura." });
    }
    if (matricula.isAfter(hoje)) {
      return res
        .status(400)
        .json({ error: "Data de matrícula não pode ser futura." });
    } // Verificação de duplicidade

    const [existing] = await pool.query(
      `SELECT * FROM alunos WHERE LOWER(name) = LOWER(?) AND LOWER(responsavel) = LOWER(?)`,
      [name, responsavel]
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: "Aluno já cadastrado com esse responsável." });
    } // Inserção no banco

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
        nascimento.toDate(), // Já está no formato correto para o banco
        responsavel,
        telefone,
        matricula.toDate(), // Já está no formato correto para o banco
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
// Atualizar aluno por ID
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

    // Converte e valida as datas de entrada
    const nascimento = dataNascimento
      ? moment(dataNascimento, "DD/MM/YYYY")
      : null;
    const matricula = dataMatricula
      ? moment(dataMatricula, "DD/MM/YYYY")
      : null;

    if (
      (nascimento && !nascimento.isValid()) ||
      (matricula && !matricula.isValid())
    ) {
      return res
        .status(400)
        .json({ error: "Formato de data inválido. Use DD/MM/YYYY." });
    }

    const updated = await Model.updateStudent(table, id, {
      name,
      dataNascimento: nascimento?.toDate(),
      responsavel,
      telefone,
      dataMatricula: matricula?.toDate(),
      serie,
      observacao,
      situacao,
    });

    const [alunoAtualizado] = await Model.getStudentById(table, id);

    res.status(200).json({
      message: "Aluno atualizado com sucesso",
      student: formatDates(alunoAtualizado),
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar aluno:", error.message);
    res.status(500).json({ error: "Erro ao atualizar aluno no banco" });
  }
};

// Deletar aluno por ID
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
