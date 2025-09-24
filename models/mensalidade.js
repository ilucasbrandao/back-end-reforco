import { pool } from "../db.js";

//! LISTAR MENSALIDADE POR ALUNO
export const mensalidadeByID = async (table, id) => {
  try {
    const result = await pool.query(
      `SELECT valor, data_pagamento, mes_referencia, ano_referencia FROM ${table} WHERE id_aluno = $1 ORDER BY data_pagamento DESC`,
      [id]
    );

    return result.rows;
  } catch (error) {
    throw new Error("Erro ao buscar aluno por ID: " + error.message);
  }
};

//! CADASTRAR MENSALIDADE
export const criarMensalidade = async (table, columns, values) => {
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
