import dayjs from "dayjs";
import prisma from "../prisma.js";
// =========================================================================
// FUNÇÕES AUXILIARES (DATAS)
// =========================================================================

const formatDespesasDates = (despesa) => {
  if (!despesa) return despesa;
  return {
    ...despesa,
    data_pagamento: despesa.data_pagamento
      ? dayjs(despesa.data_pagamento).add(3, "hour").format("YYYY-MM-DD")
      : null,
    criado_em: despesa.criado_em ? despesa.criado_em.toISOString() : null,
    atualizado_em: despesa.atualizado_em
      ? despesa.atualizado_em.toISOString()
      : null,
  };
};

// =========================================================================
// CONTROLLERS
// =========================================================================

// Listar despesa por ID
export const listarDespesa = async (req, res) => {
  try {
    const { id } = req.params;
    const despesa = await prisma.despesas.findUnique({
      where: { id_despesa: parseInt(id) },
    });

    if (!despesa) {
      return res.status(404).json({ message: "Despesa não encontrada." });
    }
    res.status(200).json(formatDespesasDates(despesa));
  } catch (error) {
    console.error("❌ Erro ao listar despesa:", error.message);
    res.status(500).json({ error: "Erro ao buscar despesa" });
  }
};

// Listar todas as despesas de um professor
export const despesaByProfessor = async (req, res) => {
  try {
    const { id } = req.params; // ID do professor
    const despesas = await prisma.despesas.findMany({
      where: { id_professor: parseInt(id) },
      orderBy: { data_pagamento: "desc" },
    });

    if (!despesas || despesas.length === 0) {
      return res
        .status(404)
        .json({ message: "Nenhuma despesa encontrada para este professor" });
    }

    res.json(despesas.map(formatDespesasDates));
  } catch (error) {
    console.error("❌ Erro ao buscar despesas por professor:", error.message);
    res.status(500).json({ error: "Erro ao buscar despesas" });
  }
};

// Cadastrar Despesa
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
      !categoria
    ) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    const novaDespesa = await prisma.despesas.create({
      data: {
        id_professor: parseInt(id_professor),
        valor: parseFloat(valor),
        data_pagamento: new Date(data_pagamento),
        mes_referencia: parseInt(mes_referencia),
        ano_referencia: parseInt(ano_referencia),
        categoria,
        descricao: descricao || "Despesa geral",
      },
    });

    res.status(201).json(formatDespesasDates(novaDespesa));
  } catch (error) {
    console.error("❌ Erro ao cadastrar despesa:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar despesa." });
  }
};

// Deletar Despesa
export const deletarDespesa = async (req, res) => {
  try {
    const { id } = req.params;

    const deletada = await prisma.despesas.delete({
      where: { id_despesa: parseInt(id) },
    });

    res.status(200).json({
      message: "Despesa deletada com sucesso",
      despesa: formatDespesasDates(deletada),
    });
  } catch (error) {
    console.error("❌ Erro ao deletar despesa:", error.message);
    res
      .status(500)
      .json({ error: "Erro ao excluir despesa ou registro não encontrado." });
  }
};

// Buscar despesa específica vinculada a um professor (Segurança)
export const despesaByProfessorIdDespesa = async (req, res) => {
  try {
    const { professorId, despesaId } = req.params;

    const despesa = await prisma.despesas.findFirst({
      where: {
        id_despesa: parseInt(despesaId),
        id_professor: parseInt(professorId),
      },
    });

    if (!despesa) {
      return res
        .status(404)
        .json({ message: "Despesa não encontrada para este professor." });
    }
    res.status(200).json(formatDespesasDates(despesa));
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao buscar despesa." });
  }
};

// Atualizar Despesa (Adicionado para seguir o padrão dos outros controllers)
export const atualizarDespesa = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const atualizada = await prisma.despesas.update({
      where: { id_despesa: parseInt(id) },
      data: {
        ...data,
        valor: data.valor ? parseFloat(data.valor) : undefined,
        data_pagamento: data.data_pagamento
          ? new Date(data.data_pagamento)
          : undefined,
        atualizado_em: new Date(),
      },
    });

    res.status(200).json(formatDespesasDates(atualizada));
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar despesa." });
  }
};
