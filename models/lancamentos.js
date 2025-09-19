import { pool } from "../db.js";

//! LISTAR TODOS
export const getAll = async (table) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
    return result.rows;
  } catch (error) {
    throw new Error("Erro ao buscar todos os alunos: " + error.message);
  }
};

//! LISTAR SOMENTE POR ID
export const getById = async (table, id) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [
      id,
    ]);
    return result.rows;
  } catch (error) {
    throw new Error("Erro ao buscar aluno por ID: " + error.message);
  }
};

//! CRIAR
export const create = async (table, columns, values) => {
  try {
    const cols = columns.join(", ");
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao inserir aluno: " + error.message);
  }
};

//! ATUALIZAR POR ID
export const update = async (table, id, data) => {
  try {
    const columns = Object.keys(data).filter(
      (key) => data[key] !== undefined && data[key] !== null
    );
    const values = columns.map((key) => data[key]);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");

    if (columns.length === 0) {
      return { rowCount: 0 };
    }

    const result = await pool.query(
      `UPDATE ${table} SET ${setClause}, atualizado_em = CURRENT_TIMESTAMP WHERE id = $${
        columns.length + 1
      } RETURNING *`,
      [...values, id]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao atualizar aluno: " + error.message);
  }
};

//! DELETAR POR ID
export const deleteLancamento = async (table, id) => {
  try {
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao deletar aluno: " + error.message);
  }
};
