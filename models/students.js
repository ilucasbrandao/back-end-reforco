import { pool } from "../db.js";

export const getStudentsAll = async (table) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
    return rows;
  } catch (error) {
    throw new Error("Erro ao buscar todos os alunos: " + error.message);
  }
};

export const getStudentById = async (table, id) => {
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return rows; // Apenas retorne o array completo
};

export const createStudent = async (table, columns, values) => {
  const cols = columns.join(", ");
  const placeholders = values.map(() => "?").join(", ");
  const [result] = await pool.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
    values
  );
  return await getStudentById(table, result.insertId); // reaproveitando a função que seleciona por ID
};

//tarefa de casa:  adicionar o TRY/CATCH para todas as funções

export const updateStudent = async (table, id, data) => {
  try {
    const columns = Object.keys(data).filter(
      (key) => data[key] !== undefined && data[key] !== null
    );
    const values = columns.map((key) => data[key]);
    const setClause = columns.map((col) => `${col} = ?`).join(", ");

    if (columns.length === 0) {
      return { affectedRows: 0 }; // Não há nada para atualizar
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
