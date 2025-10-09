import * as Model from "../models/mensalidade.js";
const table = "receitas";

// Utilitário simples para formatar datas de mensalidade
const formatMensalidadeDates = (receita) => {
  if (!receita) return receita;
  return {
    ...receita,
    // Agora data_pagamento será igual ao criado_em
    data_pagamento: receita.criado_em?.toISOString().split("T")[0] || null, // YYYY-MM-DD
    criado_em: receita.criado_em?.toISOString(),
    atualizado_em: receita.atualizado_em?.toISOString(),
  };
};

//? LISTAR MENSALIDADE POR ID_MENSALIDADE
export const listarMensalidade = async (req, res) => {
  try {
    const { id } = req.params;
    const receita = await Model.getMensalidadeById(table, id);

    if (!receita) {
      return res.status(404).json({ message: "Mensalidade não encontrada." });
    }

    res.status(200).json(formatMensalidadeDates(receita));
  } catch (error) {
    console.error("❌ Erro ao listar mensalidade:", error.message);
    res.status(500).json({ error: "Erro ao buscar mensalidade" });
  }
};

//? LISTAR TODAS AS MENSALIDADES DE UM ALUNO
export const mensalidadeByAluno = async (req, res) => {
  try {
    const { id } = req.params; // id do aluno
    const receitas = await Model.getMensalidadesByAlunoId(table, id);

    if (!receitas || receitas.length === 0) {
      return res
        .status(404)
        .json({ message: "Nenhuma mensalidade encontrada para este aluno." });
    }

    res.json(receitas.map(formatMensalidadeDates));
  } catch (error) {
    console.error("❌ Erro ao buscar mensalidades por aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar mensalidades" });
  }
};

//? Buscar uma mensalidade específica de um aluno
export const mensalidadeByAlunoId = async (req, res) => {
  try {
    const { alunoId, receitaId } = req.params;
    const receita = await Model.getMensalidadeById(table, receitaId);

    if (!receita || receita.id_aluno != alunoId) {
      return res
        .status(404)
        .json({ message: "Mensalidade não encontrada para este aluno." });
    }

    res.json(formatMensalidadeDates(receita));
  } catch (error) {
    console.error("❌ Erro ao buscar mensalidade do aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar mensalidade" });
  }
};

//? CADASTRAR MENSALIDADE
//? CADASTRAR MENSALIDADE
export const cadastrarMensalidade = async (req, res) => {
  try {
    const {
      id_aluno,
      data_pagamento,
      valor,
      mes_referencia,
      ano_referencia,
      descricao,
    } = req.body;

    if (
      !id_aluno ||
      !valor ||
      !data_pagamento ||
      !mes_referencia ||
      !ano_referencia ||
      !descricao
    ) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    // 🔎 1. Verifica se já existe mensalidade no mesmo mês/ano para o aluno
    const verificaDuplicada = await Model.getMensalidadeExistente(
      "receitas",
      id_aluno,
      mes_referencia,
      ano_referencia
    );

    if (verificaDuplicada) {
      return res.status(409).json({
        success: false,
        message:
          "Já existe uma mensalidade cadastrada para este aluno neste mês.",
      });
    }

    // 🔹 2. Se não existir, cadastra normalmente
    const novaReceita = await Model.cadastrarMensalidadeAll(
      "receitas",
      [
        "id_aluno",
        "valor",
        "data_pagamento",
        "mes_referencia",
        "ano_referencia",
        "descricao",
      ],
      [
        id_aluno,
        valor,
        data_pagamento,
        mes_referencia,
        ano_referencia,
        descricao,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Mensalidade cadastrada com sucesso!",
      data: novaReceita,
    });
  } catch (error) {
    console.error("❌ Erro ao cadastrar mensalidade:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar mensalidade." });
  }
};

//? DELETAR MENSALIDADE
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const receitaDeletada = await Model.deleteMensalidade(table, id);

    if (!receitaDeletada) {
      return res
        .status(404)
        .json({ message: "Mensalidade não encontrada para exclusão." });
    }

    res.status(200).json({
      message: "Mensalidade deletada com sucesso",
      receitas: formatMensalidadeDates(receitaDeletada),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar mensalidade:", error.message);
    res.status(500).json({ error: "Erro interno ao excluir mensalidade." });
  }
};

//? LISTAR MENSALIDADE ESPECÍFICA DE UM ALUNO
export const mensalidadeByAlunoIdMensalidade = async (req, res) => {
  try {
    const { alunoId, receitasId } = req.params;

    const receita = await Model.getMensalidadeByAlunoIdMensalidade(
      table,
      alunoId,
      receitasId
    );

    if (!receita) {
      return res.status(404).json({ message: "Mensalidade não encontrada." });
    }

    res.status(200).json(formatMensalidadeDates(receita));
  } catch (error) {
    console.error(
      "❌ Erro ao buscar mensalidade específica do aluno:",
      error.message
    );
    res.status(500).json({ error: "Erro interno ao buscar mensalidade." });
  }
};

// Deletar mensalidade específica de um aluno
export const deletarMensalidadeAluno = async (req, res) => {
  try {
    const { alunoId, receitasId } = req.params;
    const receita = await Model.getMensalidadeById(table, receitasId);

    if (!receita || receita.id_aluno != alunoId) {
      return res
        .status(404)
        .json({ message: "Mensalidade não encontrada para este aluno." });
    }

    const receitaDeletada = await Model.deleteMensalidade(table, receitasId);

    res.status(200).json({
      message: "Mensalidade deletada com sucesso",
      mensalidade: formatMensalidadeDates(receitaDeletada),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar mensalidade do aluno:", error.message);
    res.status(500).json({ error: "Erro ao deletar mensalidade." });
  }
};
