import { pool } from "../db.js";

//! LISTAR TODOS
export const getTeachersAll = async (table) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC`);
    return result.rows;
  } catch (error) {
    throw new Error("Erro ao buscar todos os professores: " + error.message);
  }
};

//! LISTAR POR ID
export const getTeachersById = async (table, id) => {
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [
      id,
    ]);
    return result.rows;
  } catch (error) {
    throw new Error("Erro ao buscar professor(a) por ID: " + error.message);
  }
};

//! CRIAR
export const createTeacher = async (table, columns, values) => {
  try {
    const cols = columns.join(", ");
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao inserir professor(a): " + error.message);
  }
};

//! ATUALIZAR POR ID
export const updateTeacher = async (table, id, data) => {
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
    throw new Error("Erro ao atualizar professor(a)" + error.message);
  }
};

//! DELETAR POR ID
export const deleteTeacher = async (table, id) => {
  try {
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    throw new Error("Erro ao deletar professor(a): " + error.message);
  }
};
