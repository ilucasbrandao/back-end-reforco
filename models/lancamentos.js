import { pool } from "../db.js";

export const LancamentoModel = {
  async getAll() {
    const res = await pool.query(`
            SELECT l.*, a.nome AS aluno_nome, p.nome AS professor_nome
            FROM lancamentos l
            LEFT JOIN alunos a ON l.aluno_id = a.id
            LEFT JOIN professores p ON l.professor_id = p.id
            ORDER BY l.data_vencimento DESC
        `);
    return res.rows;
  },

  async getById(id) {
    const res = await pool.query(
      `
            SELECT l.*, a.nome AS aluno_nome, p.nome AS professor_nome
            FROM lancamentos l
            LEFT JOIN alunos a ON l.aluno_id = a.id
            LEFT JOIN professores p ON l.professor_id = p.id
            WHERE l.id = $1
        `,
      [id]
    );
    return res.rows[0];
  },

  async create(data) {
    const {
      tipo,
      categoria,
      descricao,
      valor,
      data_vencimento,
      data_pagamento,
      aluno_id,
      professor_id,
      status,
    } = data;

    const res = await pool.query(
      `
        INSERT INTO lancamentos 
            (tipo, categoria, descricao, valor, data_vencimento, data_pagamento, aluno_id, professor_id, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id
        `,
      [
        tipo,
        categoria,
        descricao,
        valor,
        data_vencimento || null,
        data_pagamento || null,
        aluno_id || null,
        professor_id || null,
        status,
      ]
    );

    return res.rows[0].id;
  },
  async update(id, data) {
    const {
      tipo,
      categoria,
      descricao,
      valor,
      data_vencimento,
      aluno_id,
      professor_id,
    } = data;
    await pool.query(
      `
            UPDATE lancamentos
            SET tipo=$1, categoria=$2, descricao=$3, valor=$4, data_vencimento=$5,
                aluno_id=$6, professor_id=$7, atualizado_em=NOW()
            WHERE id=$8
        `,
      [
        tipo,
        categoria,
        descricao,
        valor,
        data_vencimento,
        aluno_id || null,
        professor_id || null,
        id,
      ]
    );
  },

  async delete(id) {
    await pool.query(`DELETE FROM lancamentos WHERE id=$1`, [id]);
  },
};
