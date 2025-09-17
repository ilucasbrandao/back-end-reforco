import * as Model from "../models/students.js";
const table = "alunos";

// Utilitário simples para formatar datas (opcional)
const formatDates = (aluno) => {
  if (!aluno) return aluno;
  return {
    ...aluno,
    dataNascimento: aluno.dataNascimento?.toISOString().split("T")[0],
    dataMatricula: aluno.dataMatricula?.toISOString().split("T")[0],
    criado_em: aluno.criado_em?.toISOString(),
    atualizado_em: aluno.atualizado_em?.toISOString(),
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
export const listarAlunosID = async (req, res) => {
  try {
    const { id } = req.params;
    const aluno = await Model.getStudentById(table, id);
    if (!aluno || aluno.length === 0)
      return res.status(404).json({ message: "Aluno não encontrado!" });

    res.json(formatDates(aluno[0]));
  } catch (error) {
    console.error("❌ Erro ao buscar aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};

//! Criar aluno - back cru, sem validação
export const cadastrar = async (req, res) => {
  try {
    const {
      nome,
      data_nascimento,
      responsavel,
      telefone,
      data_matricula,
      serie,
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
        "serie",
        "observacao",
        "status",
      ],
      [
        nome,
        data_nascimento,
        responsavel,
        telefone,
        data_matricula,
        serie,
        observacao,
        status,
      ]
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

//! Atualizar aluno - back cru, sem validação
export const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const alunoExistente = await Model.getStudentById(table, id);
    if (!alunoExistente || alunoExistente.length === 0) {
      return res.status(404).json({ message: "Aluno não encontrado." });
    }

    const {
      nome,
      data_nascimento,
      responsavel,
      telefone,
      data_matricula,
      serie,
      observacao,
      status,
    } = req.body;

    const alunoAtualizado = await Model.updateStudent(table, id, {
      nome: nome?.trim() || "",
      data_nascimento: data_nascimento || "",
      responsavel: responsavel?.trim() || "",
      telefone: telefone || "",
      data_matricula: data_matricula || "",
      serie: serie?.trim() || "",
      observacao: observacao || "",
      status: status?.trim() || "ativo",
    });

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
