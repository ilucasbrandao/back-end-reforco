import { pool } from "../db.js";

export const getStudentsAll = async (table) => {
  const [rows] = await pool.query(`SELECT * FROM ${table}`);
  return rows;
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
  const [newRows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [
    result.insertId,
  ]);
  return newRows[0];
};
