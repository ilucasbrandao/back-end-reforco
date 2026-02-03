import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// =========================================================================
// FUNÇÕES AUXILIARES (DATAS)
// =========================================================================

const formatMensalidadeDates = (receita) => {
  if (!receita) return receita;

  const adjustDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    // Ajuste de fuso para garantir consistência entre banco e visualização
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  };

  return {
    ...receita,
    data_pagamento: adjustDate(receita.data_pagamento),
    criado_em: receita.criado_em
      ? new Date(receita.criado_em).toISOString()
      : null,
    atualizado_em: receita.atualizado_em
      ? new Date(receita.atualizado_em).toISOString()
      : null,
  };
};

// =========================================================================
// CONTROLLERS
// =========================================================================

// Listar mensalidade específica por ID
export const listarMensalidade = async (req, res) => {
  try {
    const { id } = req.params;
    const receita = await prisma.receitas.findUnique({
      where: { id_mensalidade: parseInt(id) },
    });

    if (!receita) {
      return res.status(404).json({ message: "Mensalidade não encontrada." });
    }

    res.status(200).json(formatMensalidadeDates(receita));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar mensalidade" });
  }
};

// Listar todas as mensalidades de um aluno específico
export const mensalidadeByAluno = async (req, res) => {
  try {
    const { id } = req.params; // ID do Aluno
    const receitas = await prisma.receitas.findMany({
      where: { id_aluno: parseInt(id) },
      orderBy: { data_pagamento: "desc" },
    });

    res.json(receitas.map(formatMensalidadeDates));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar mensalidades do aluno." });
  }
};

// Cadastrar nova mensalidade (com verificação de duplicidade)
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
      !ano_referencia
    ) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    // 1. Verificar se já existe mensalidade para este aluno no mês/ano
    const verificaDuplicada = await prisma.receitas.findFirst({
      where: {
        id_aluno: parseInt(id_aluno),
        mes_referencia: parseInt(mes_referencia),
        ano_referencia: parseInt(ano_referencia),
      },
    });

    if (verificaDuplicada) {
      return res.status(409).json({
        success: false,
        message:
          "Já existe uma mensalidade cadastrada para este aluno neste mês.",
      });
    }

    // 2. Criar no banco
    const novaReceita = await prisma.receitas.create({
      data: {
        id_aluno: parseInt(id_aluno),
        valor: parseFloat(valor),
        data_pagamento: new Date(data_pagamento),
        mes_referencia: parseInt(mes_referencia),
        ano_referencia: parseInt(ano_referencia),
        descricao: descricao || "Mensalidade",
      },
    });

    res
      .status(201)
      .json({ success: true, data: formatMensalidadeDates(novaReceita) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar mensalidade." });
  }
};

// Atualizar mensalidade existente
export const atualizarMensalidade = async (req, res) => {
  try {
    const { id } = req.params; // id_mensalidade
    const { data_pagamento, valor, mes_referencia, ano_referencia, descricao } =
      req.body;

    const atualizada = await prisma.receitas.update({
      where: { id_mensalidade: parseInt(id) },
      data: {
        data_pagamento: data_pagamento ? new Date(data_pagamento) : undefined,
        valor: valor ? parseFloat(valor) : undefined,
        mes_referencia: mes_referencia ? parseInt(mes_referencia) : undefined,
        ano_referencia: ano_referencia ? parseInt(ano_referencia) : undefined,
        descricao: descricao,
        atualizado_em: new Date(),
      },
    });

    res.status(200).json({
      message: "Atualizada com sucesso!",
      data: formatMensalidadeDates(atualizada),
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar mensalidade." });
  }
};

// Deletar mensalidade
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const deletada = await prisma.receitas.delete({
      where: { id_mensalidade: parseInt(id) },
    });

    res.status(200).json({
      message: "Mensalidade deletada com sucesso",
      data: formatMensalidadeDates(deletada),
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao deletar mensalidade ou registro não encontrado.",
    });
  }
};
