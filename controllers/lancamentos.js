import { LancamentoModel } from "../models/lancamentos.js";

export const LancamentoController = {
  async getAll(req, res) {
    try {
      const lancamentos = await LancamentoModel.getAll();
      res.json(lancamentos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao listar lançamentos." });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const lancamento = await LancamentoModel.getById(id);
      if (!lancamento)
        return res.status(404).json({ message: "Lançamento não encontrado." });
      res.json(lancamento);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar lançamento." });
    }
  },

  async create(req, res) {
    try {
      const id = await LancamentoModel.create(req.body);
      res.status(201).json({ message: "Lançamento criado com sucesso!", id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao criar lançamento." });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      await LancamentoModel.update(id, req.body);
      res.json({ message: "Lançamento atualizado com sucesso!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao atualizar lançamento." });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await LancamentoModel.delete(id);
      res.json({ message: "Lançamento excluído com sucesso!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao excluir lançamento." });
    }
  },
};
