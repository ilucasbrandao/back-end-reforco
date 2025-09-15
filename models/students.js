import { pool } from "../db.js";

export const getStudentsAll = async (table) => {
  const [rows] = await pool.query(`SELECT * FROM ${table}`);
  return rows;
};

export const getStudentById = async (table, id) => {
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return rows[0];
};

<<<<<<< HEAD
export const createStudent = async (table, columns, values) => {
  const cols = columns.join(", ");
  const placeholders = values.map(() => "?").join(", ");
=======
// --------- ROTA POST ---------//
export const cadastrar = async (table, columns, values) => {
  const cols = columns.join(", "); // nome das colunas separadas por ", "
  const placeholders = values.map(() => "?").join(", "); // usa "?" para cada valor
>>>>>>> 27efdeb30957dab60549549ed33df3ac77295e63
  const [result] = await pool.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
    values
  );
  const [newRows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [
    result.insertId,
  ]);
  return newRows[0];
};
