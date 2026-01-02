import { pool } from "../db.js";

export const FeedbackModel = {
  listarPorAluno(alunoId) {
  return pool.query(
    `SELECT 
      f.id,
      f.bimestre,
      f.avaliacao_pedagogica,
      f.avaliacao_psico,
      f.fotos,
      f.observacao,
      f.data_aula,
      f.lido_pelos_pais,
      u.nome AS autor_nome
     FROM feedbacks f
     JOIN users u ON u.id = f.autor_id
     WHERE f.aluno_id = $1
     ORDER BY f.data_aula DESC, f.criado_em DESC`,
    [alunoId]
  );
},


  criar(data) {
    const {
      aluno_id,
      autor_id,
      bimestre,
      avaliacao_pedagogica,
      avaliacao_psico,
      fotos,
      observacao,
    } = data;

    return pool.query(
      `INSERT INTO feedbacks
       (aluno_id, autor_id, bimestre, avaliacao_pedagogica, avaliacao_psico, fotos, observacao, data_aula)
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE)
       RETURNING *`,
      [
        aluno_id,
        autor_id,
        bimestre,
        avaliacao_pedagogica,
        avaliacao_psico,
        JSON.stringify(fotos || []),
        observacao,
      ]
    );
  },

  marcarComoLido(id) {
    return pool.query(
      "UPDATE feedbacks SET lido_pelos_pais = TRUE WHERE id = $1",
      [id]
    );
  },

  atualizar(id, data) {
    const {
      bimestre,
      avaliacao_pedagogica,
      avaliacao_psico,
      fotos,
      observacao,
    } = data;

    return pool.query(
      `UPDATE feedbacks
       SET bimestre = $1,
           avaliacao_pedagogica = $2,
           avaliacao_psico = $3,
           fotos = $4,
           observacao = $5
       WHERE id = $6
       RETURNING *`,
      [
        bimestre,
        avaliacao_pedagogica,
        avaliacao_psico,
        JSON.stringify(fotos || []),
        observacao,
        id,
      ]
    );
  },

  deletar(id) {
    return pool.query("DELETE FROM feedbacks WHERE id = $1", [id]);
  },
};
