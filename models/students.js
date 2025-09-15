import { pool } from "../db.js";

//! LISTAR TODOS
export const getStudentsAll = async (table) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC`);
    return rows;
  } catch (error) {
    throw new Error("Erro ao buscar todos os alunos: " + error.message);
  }
};

//! LISTAR SOMENTE POR ID
export const getStudentById = async (table, id) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [
      id,
    ]);
    return rows;
  } catch (error) {
    throw new Error("Erro ao buscar aluno por ID: " + error.message);
  }
};

//! CRIAR
export const createStudent = async (table, columns, values) => {
  try {
    const cols = columns.join(", ");
    const placeholders = values.map(() => "?").join(", ");
    const [result] = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
      values
    );
    return result;
  } catch (error) {
    throw new Error("Erro ao inserir aluno: " + error.message);
  }
};

//! ATUALIZAR POR ID
export const updateStudent = async (table, id, data) => {
  try {
    const columns = Object.keys(data).filter(
      (key) => data[key] !== undefined && data[key] !== null
    );
    const values = columns.map((key) => data[key]);
    const setClause = columns.map((col) => `${col} = ?`).join(", ");

    if (columns.length === 0) {
      return { affectedRows: 0 };
    }

    const [result] = await pool.query(
      `UPDATE ${table} SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    return result;
  } catch (error) {
    throw new Error("Erro ao atualizar aluno: " + error.message);
  }
};

//! DELETAR POR ID
export const deleteStudent = async (table, id) => {
  try {
    const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [
      id,
    ]);
    return result;
  } catch (error) {
    throw new Error("Erro ao deletar aluno: " + error.message);
  }
};
