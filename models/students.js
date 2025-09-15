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
  return rows[0];
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
