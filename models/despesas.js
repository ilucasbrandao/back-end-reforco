import { pool } from "../db.js";

//! LISTAR SOMENTE POR ID
export const getDespesaById = async (table, id) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE id_despesa = $1`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao buscar despesa por ID" + error.message);
  }
};

//! LISTAR TODAS AS DESPESAS DE UM PROFESSOR
export const getDespesaByProfessorId = async (table, idProfessor) => {
  try {
    const result = await pool.query(
      `SELECT id_despesa, id_professor, valor, data_pagamento, mes_referencia, ano_referencia FROM ${table} WHERE id_professor = $1 ORDER BY data_pagamento DESC`,
      [idProfessor]
    );
    return result.rows;
  } catch (error) {
    throw new Error("Erro ao buscar despesa por professor:" + error.message);
  }
};

//! CADASTRAR DESPESA
export const cadastrarDespesaAll = async (table, columns, values) => {
  try {
    const cols = columns.join(", ");
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao inserir despesa:" + error.message);
  }
};

//! DELETAR POR ID
export const deletarDespesa = async (table, id) => {
  try {
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id_despesa = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw new Error("Erro ao deletar despesa:" + error.message);
  }
};

//! LISTAR DESPESA POR ID DE PROFESSOR E ID DE DESPESA
export const getDespesaByProfessorIdDespesa = async (
  table,
  idProfessor,
  idDespesa
) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE id_professor = $1 AND id_despesa = $2 LIMIT 1`,
      [idProfessor, idDespesa]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw new Error(
      "Erro ao buscar despesa por professor e ID" + error.message
    );
  }
};
