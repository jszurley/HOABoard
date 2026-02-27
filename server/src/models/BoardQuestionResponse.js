const pool = require('../config/db');

const BoardQuestionResponse = {
  async create(questionId, respondedBy, message, isPublic) {
    const result = await pool.query(
      `INSERT INTO board_question_responses (question_id, responded_by, message, is_public)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [questionId, respondedBy, message, isPublic || false]
    );
    return result.rows[0];
  },

  async findByQuestion(questionId) {
    const result = await pool.query(
      `SELECT bqr.*, u.name as responder_name, u.avatar_url as responder_avatar
       FROM board_question_responses bqr
       LEFT JOIN users u ON bqr.responded_by = u.id
       WHERE bqr.question_id = $1
       ORDER BY bqr.created_at`,
      [questionId]
    );
    return result.rows;
  }
};

module.exports = BoardQuestionResponse;
