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
    const cols = columns.join(", ");
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao inserir mensalidade: " + error.message);
  }
};

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
