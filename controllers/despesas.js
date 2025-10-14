import dayjs from "dayjs";
import * as Model from "../models/despesas.js";
const table = "despesas";

// Utilitário simples para formatar datas de mensalidade
const formatDespesasDates = (despesa) => {
  if (!despesa) return despesa;
  return {
    ...despesa,
    data_pagamento: despesa.data_pagamento
      ? dayjs(despesa.data_pagamento).format("YYYY-MM-DD")
      : null,
    criado_em: despesa.criado_em ? despesa.criado_em.toISOString() : null,
    atualizado_em: despesa.atualizado_em
      ? despesa.atualizado_em.toISOString()
      : null,
  };
};

//?  LISTAR DESPESA POR ID_MENSALIDADE
export const listarDespesa = async (req, res) => {
  try {
    const { id } = req.params;
    const despesa = await Model.getDespesaById(table, id);

    if (!despesa) {
      return res.status(404).json({ message: "Despesa não encontrada." });
    }
    res.status(200).json(formatDespesasDates(despesa));
  } catch (error) {
    console.error("❌ Erro ao listar despesa:", error.message);
    res.status(500).json({ error: "Erro ao buscar despesa" });
  }
};

//? LISTAR TODAS AS DESPESAS DE UM PROFESSOR
export const despesaByProfessor = async (req, res) => {
  try {
    const { id } = req.params;
    const despesas = await Model.getDespesaByProfessorId(table, id);

    if (!despesas || despesas.length === 0) {
      return res
        .status(404)
        .json({ message: " Nenhuma despesa encontrada para este professor" });
    }

    res.json(despesas.map(formatDespesasDates));
  } catch (error) {
    console.error("❌ Erro ao buscar despesas por professor:", error.message);
    res.status(500).json({ error: "Erro ao buscar despesas" });
  }
};

//? BUSCAR UMA DESPESA ESPECÍFICA DE UM PROFESSOR
export const despesaByProfessorId = async (req, res) => {
  try {
    const { professorId, despesaId } = req.params;
    const despesa = await Model.getDespesaById(table, despesaId);

    if (!despesa || despesa.id_professor != professorId) {
      return res
        .status(404)
        .json({ message: " Despesa não encontrada para este professor(a.)" });
    }

    res.json(formatDespesasDates(despesa));
  } catch (error) {
    console.error("❌ Erro ao buscar despesas do professor(a):", error.message);
    res.status(500).json({ error: "Erro ao buscar despesas" });
  }
};

//? CADASTRAR DESPESA
export const cadastrarDespesa = async (req, res) => {
  try {
    const {
      id_professor,
      valor,
      data_pagamento,
      mes_referencia,
      ano_referencia,
      categoria,
      descricao,
    } = req.body;

    if (
      !id_professor ||
      !valor ||
      !data_pagamento ||
      !mes_referencia ||
      !ano_referencia ||
      !categoria ||
      !descricao
    ) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    const novaDespesa = await Model.cadastrarDespesaAll(
      table,
      [
        "id_professor",
        "valor",
        "data_pagamento",
        "mes_referencia",
        "ano_referencia",
        "categoria",
        "descricao",
      ],
      [
        id_professor,
        valor,
        data_pagamento,
        mes_referencia,
        ano_referencia,
        categoria,
        descricao,
      ]
    );
    res.status(201).json(formatDespesasDates(novaDespesa));
  } catch (error) {
    console.error("❌ Erro ao cadastrar despesa:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar despesa." });
  }
};

//? DELETAR DESPESA
export const deletarDespesa = async (req, res) => {
  try {
    const { id } = req.params;
    const despesaDeletada = await Model.deletarDespesa(table, id);

    if (!despesaDeletada) {
      return res
        .status(404)
        .json({ message: "Despesa não encontrada para exclusão" });
    }
    res.status(200).json({
      message: "Despesa deletada com sucesso",
      despesa: formatDespesasDates(despesaDeletada),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar despesa:", error.message);
    res.status(500).json({ error: "Erro interno ao excluir despesa." });
  }
};

//? LISTAR DESPESA ESPECÍFICA DE UM PROFESSOR
export const despesaByProfessorIdDespesa = async (req, res) => {
  try {
    const { professorId, despesaId } = req.params;

    const despesa = await Model.getDespesaByProfessorIdDespesa(
      "despesas",
      professorId,
      despesaId
    );
    if (!despesa) {
      return res.status(404).json({ message: "Despesa não encontrada." });
    }
    res.status(200).json(formatDespesasDates(despesa));
  } catch (error) {
    console.error(
      "❌ Erro ao buscar despesa específica do aluno:",
      error.message
    );
    res.status(500).json({ error: "Erro interno ao buscar despesa." });
  }
};

//? DELETAR DESPESA ESPECÍFICA DE UM PROFESSOR
export const deletarDespesaProfessor = async (req, res) => {
  try {
    const { professorId, despesaId } = req.params;
    const despesa = await Model.getDespesaById(table, despesaId);

    if (!despesa || despesa.id_professor != professorId) {
      return res
        .status(404)
        .json({ message: "Despesa não encontrada para este professor(a)" });
    }

    const despesaDeletada = await Model.deletarDespesa(table, despesaId);

    res.status(200).json({
      message: "Despesa deletada com sucesso",
      despesa: formatDespesasDates(despesaDeletada),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar despesa do professor(a):", error.message);
    res.status(500).json({ error: "Erro ao deletar despesa." });
  }
};
