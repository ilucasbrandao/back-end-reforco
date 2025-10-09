import { pool } from "../db.js";

//! LISTAR SOMENTE POR ID
export const getMensalidadeById = async (table, id) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE id_mensalidade = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw new Error("Erro ao buscar mensalidade por ID: " + error.message);
  }
};

//! LISTAR TODAS AS MENSALIDADES DE UM ALUNO
export const getMensalidadesByAlunoId = async (table, idAluno) => {
  try {
    const result = await pool.query(
      `SELECT id_mensalidade, id_aluno, valor, data_pagamento, mes_referencia, ano_referencia FROM ${table} WHERE id_aluno = $1 ORDER BY data_pagamento DESC`,
      [idAluno]
    );

    return result.rows;
  } catch (error) {
    throw new Error("Erro ao buscar mensalidades por aluno: " + error.message);
  }
};

//! CADASTRAR MENSALIDADE
export const cadastrarMensalidadeAll = async (table, columns, values) => {
  try {
    // Monta os nomes das colunas (ex: "id_aluno, valor, data_pagamento, ...")
    const cols = columns.join(", ");

    // Substitui apenas o placeholder da data_pagamento por $X::date
    const placeholdersWithDateCast = columns
      .map((col, i) =>
        col === "data_pagamento" ? `$${i + 1}::date` : `$${i + 1}`
      )
      .join(", ");

    const result = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholdersWithDateCast}) RETURNING *`,
      values
    );

    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao inserir mensalidade: " + error.message);
  }
};

export async function getMensalidadeExistente(table, id_aluno, mes, ano) {
  const query = `
    SELECT id_mensalidade
    FROM ${table}
    WHERE id_aluno = $1
      AND mes_referencia = $2
      AND ano_referencia = $3
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [id_aluno, mes, ano]);
  return rows.length > 0 ? rows[0] : null;
}

//! DELETAR POR ID
export const deleteMensalidade = async (table, id) => {
  try {
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id_mensalidade = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw new Error("Erro ao deletar mensalidade: " + error.message);
  }
};

//! LISTAR MENSALIDADE POR ID DE ALUNO E ID_DE_MENSALIDADE
export const getMensalidadeByAlunoIdMensalidade = async (
  table,
  idAluno,
  idMensalidade
) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE id_aluno = $1 AND id_mensalidade = $2 LIMIT 1`,
      [idAluno, idMensalidade]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw new Error(
      "Erro ao buscar mensalidade por aluno e ID: " + error.message
    );
  }
};
