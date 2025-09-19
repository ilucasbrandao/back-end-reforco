import * as Model from "../models/lancamentos.js";

const table = "lancamentos";

//? Listar todos os lançamentos
export const listarLancamentos = async (req, res) => {
  try {
    const lancamentos = await Model.getAll(table);
    res.status(200).json(lancamentos);
  } catch (err) {
    console.error("Erro ao listar lançamentos:", err.message);
    res.status(500).json({ error: "Erro ao listar lançamentos" });
  }
};

//? Buscar lançamento por ID
export const listarLancamentoID = async (req, res) => {
  try {
    const { id } = req.params;
    const lancamento = await Model.getById(table, id);

    if (!lancamento) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    res.json(lancamento);
  } catch (err) {
    console.error("Erro ao buscar lançamento:", err.message);
    res.status(500).json({ error: "Erro ao buscar lançamento" });
  }
};

//? Criar lançamento
export const cadastrar = async (req, res) => {
  try {
    const {
      tipo,
      categoria,
      descricao,
      valor,
      data_pagamento,
      aluno_id,
      professor_id,
    } = req.body;

    const newLancamento = await Model.create(
      table,
      [
        "tipo",
        "categoria",
        "descricao",
        "valor",
        "data_pagamento",
        "aluno_id",
        "professor_id",
      ],
      [
        tipo,
        categoria,
        descricao,
        valor,
        data_pagamento,
        aluno_id || null,
        professor_id || null,
      ]
    );

    res.status(201).json({
      message: "Lançamento cadastrado com sucesso.",
      data: newLancamento,
    });
  } catch (error) {
    console.error("❌ Erro ao inserir:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar." });
  }
};

//? Atualizar lançamento
export const atualizar = async (req, res) => {
  try {
    const { id } = req.params;

    const existente = await Model.getById(table, id);
    if (!existente) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    const {
      tipo,
      categoria,
      descricao,
      valor,
      data_pagamento,
      aluno,
      professor,
    } = req.body;

    const lancamentoAtualizado = await Model.update(table, id, {
      tipo,
      categoria,
      descricao,
      valor,
      data_pagamento,
      aluno_id,
      professor_id,
    });

    res.status(200).json({
      message: "Lançamento atualizado com sucesso",
      data: lancamentoAtualizado,
    });
  } catch (err) {
    console.error("Erro ao atualizar lançamento:", err.message);
    res.status(500).json({ error: "Erro ao atualizar lançamento" });
  }
};

//? Deletar lançamento
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const deletado = await Model.remove(table, id);

    if (!deletado) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    res.json({ message: "Lançamento removido com sucesso" });
  } catch (err) {
    console.error("Erro ao remover lançamento:", err.message);
    res.status(500).json({ error: "Erro ao remover lançamento" });
  }
};
