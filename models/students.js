import { pool } from "../db.js";

// --------- ROTA LISTAR ---------//
export const getStudentsAll = async (table) => {
  const [rows] = await pool.query(`SELECT * FROM ${table}`);
  return rows;
};

// --------- ROTA LISTAR POR ID ---------//
export const getStudentById = async (table, id) => {
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  console.log(rows);
  return rows[0];
};

// --------- ROTA POST ---------//
export const cadastrar = async (table, columns, values) => {
  const cols = columns.join(", "); // nome das colunas separadas por ", "
  const placeholders = values.map(() => "?").join(", "); // usa "?" para cada valor
  const [result] = await pool.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
    values
  );
  // ID inserido e o aluno completo
  const [newRows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [
    result.insertId,
  ]);

  return newRows[0];
};
