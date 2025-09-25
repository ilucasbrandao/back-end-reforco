import * as Model from "../models/mensalidade.js";
const table = "mensalidades";

// Utilitário simples para formatar datas de mensalidade
const formatMensalidadeDates = (mensalidade) => {
  if (!mensalidade) return mensalidade;
  return {
    ...mensalidade,
    data_pagamento: mensalidade.data_pagamento?.toISOString().split("T")[0],
    criado_em: mensalidade.criado_em?.toISOString(),
    atualizado_em: mensalidade.atualizado_em?.toISOString(),
  };
};

//? LISTAR MENSALIDADE POR ID_MENSALIDADE
export const listarMensalidade = async (req, res) => {
  try {
    const { id } = req.params;
    const mensalidade = await Model.getMensalidadeById(table, id);

    if (!mensalidade) {
      return res.status(404).json({ message: "Mensalidade não encontrada." });
    }

    res.status(200).json(formatMensalidadeDates(mensalidade));
  } catch (error) {
    console.error("❌ Erro ao listar mensalidade:", error.message);
    res.status(500).json({ error: "Erro ao buscar mensalidade" });
  }
};

//? LISTAR TODAS AS MENSALIDADES DE UM ALUNO
export const mensalidadeByAluno = async (req, res) => {
  try {
    const { id } = req.params; // id do aluno
    const mensalidades = await Model.getMensalidadesByAlunoId(table, id);

    if (!mensalidades || mensalidades.length === 0) {
      return res
        .status(404)
        .json({ message: "Nenhuma mensalidade encontrada para este aluno." });
    }

    res.json(mensalidades.map(formatMensalidadeDates));
  } catch (error) {
    console.error("❌ Erro ao buscar mensalidades por aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar mensalidades" });
  }
};

//? Buscar uma mensalidade específica de um aluno
export const mensalidadeByAlunoId = async (req, res) => {
  try {
    const { alunoId, mensalidadeId } = req.params;
    const mensalidade = await Model.getMensalidadeById(table, mensalidadeId);

    if (!mensalidade || mensalidade.id_aluno != alunoId) {
      return res
        .status(404)
        .json({ message: "Mensalidade não encontrada para este aluno." });
    }

    res.json(formatMensalidadeDates(mensalidade));
  } catch (error) {
    console.error("❌ Erro ao buscar mensalidade do aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar mensalidade" });
  }
};

//? CADASTRAR MENSALIDADE
export const cadastrarMensalidade = async (req, res) => {
  try {
    const { id_aluno, valor, data_pagamento, mes_referencia, ano_referencia } =
      req.body;

    if (
      !id_aluno ||
      !valor ||
      !data_pagamento ||
      !mes_referencia ||
      !ano_referencia
    ) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    const novaMensalidade = await Model.cadastrarMensalidadeAll(
      table,
      [
        "id_aluno",
        "valor",
        "data_pagamento",
        "mes_referencia",
        "ano_referencia",
      ],
      [id_aluno, valor, data_pagamento, mes_referencia, ano_referencia]
    );

    res.status(201).json(formatMensalidadeDates(novaMensalidade));
  } catch (error) {
    console.error("❌ Erro ao cadastrar mensalidade:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar mensalidade." });
  }
};

//? DELETAR MENSALIDADE
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const mensalidadeDeletada = await Model.deleteMensalidade(table, id);

    if (!mensalidadeDeletada) {
      return res
        .status(404)
        .json({ message: "Mensalidade não encontrada para exclusão." });
    }

    res.status(200).json({
      message: "Mensalidade deletada com sucesso",
      mensalidade: formatMensalidadeDates(mensalidadeDeletada),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar mensalidade:", error.message);
    res.status(500).json({ error: "Erro interno ao excluir mensalidade." });
  }
};

//? LISTAR MENSALIDADE ESPECÍFICA DE UM ALUNO
export const mensalidadeByAlunoIdMensalidade = async (req, res) => {
  try {
    const { alunoId, mensalidadeId } = req.params;

    const mensalidade = await Model.getMensalidadeByAlunoIdMensalidade(
      "mensalidades",
      alunoId,
      mensalidadeId
    );

    if (!mensalidade) {
      return res.status(404).json({ message: "Mensalidade não encontrada." });
    }

    res.status(200).json(formatMensalidadeDates(mensalidade));
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
    const { alunoId, mensalidadeId } = req.params;
    const mensalidade = await Model.getMensalidadeById(table, mensalidadeId);

    if (!mensalidade || mensalidade.id_aluno != alunoId) {
      return res
        .status(404)
        .json({ message: "Mensalidade não encontrada para este aluno." });
    }

    const mensalidadeDeletada = await Model.deleteMensalidade(
      table,
      mensalidadeId
    );

    res.status(200).json({
      message: "Mensalidade deletada com sucesso",
      mensalidade: formatMensalidadeDates(mensalidadeDeletada),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar mensalidade do aluno:", error.message);
    res.status(500).json({ error: "Erro ao deletar mensalidade." });
  }
};
