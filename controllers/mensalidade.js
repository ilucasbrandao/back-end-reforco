import * as Model from "../models/mensalidade.js";
const table = "mensalidades";

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

//? MENSALIDADES POR ID
export const mensalidadeByAluno = async (req, res) => {
  try {
    const { id } = req.params;
    const aluno = await Model.mensalidadeByID(table, id);

    if (!aluno || aluno.length === 0)
      return res.status(404).json({ message: "Aluno não encontrado!" });

    const mensalidadesFormatadas = aluno.map(formatDates);
    res.json(mensalidadesFormatadas);
  } catch (error) {
    console.error("❌ Erro ao buscar aluno:", error.message);
    res.status(500).json({ error: "Erro ao buscar aluno" });
  }
};

// POST /mensalidades
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

    // Passa colunas e valores correspondentes
    const novaMensalidade = await Model.criarMensalidade(
      "mensalidades",
      [
        "id_aluno",
        "valor",
        "data_pagamento",
        "mes_referencia",
        "ano_referencia",
      ],
      [id_aluno, valor, data_pagamento, mes_referencia, ano_referencia]
    );

    res.status(201).json(novaMensalidade);
  } catch (error) {
    console.error("Erro ao cadastrar mensalidade:", error.message);
    res.status(500).json({ error: "Erro interno ao cadastrar mensalidade." });
  }
};
