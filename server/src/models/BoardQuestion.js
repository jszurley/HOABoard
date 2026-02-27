const pool = require('../config/db');

const BoardQuestion = {
  async create(communityId, submittedBy, data) {
    const { title, message } = data;
    const result = await pool.query(
      `INSERT INTO board_questions (community_id, submitted_by, title, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [communityId, submittedBy, title, message]
    );
    return result.rows[0];
  },

  async findByCommunityForBoard(communityId) {
    const result = await pool.query(
      `SELECT bq.*, u.name as submitter_name, u.avatar_url as submitter_avatar,
              (SELECT COUNT(*) FROM board_question_responses WHERE question_id = bq.id)::int as response_count
       FROM board_questions bq
       LEFT JOIN users u ON bq.submitted_by = u.id
       WHERE bq.community_id = $1
       ORDER BY bq.created_at DESC`,
      [communityId]
    );
    return result.rows;
  },

  async findByCommunityForResident(communityId, userId) {
    const result = await pool.query(
      `SELECT bq.*, u.name as submitter_name, u.avatar_url as submitter_avatar,
              (SELECT COUNT(*) FROM board_question_responses WHERE question_id = bq.id)::int as response_count
       FROM board_questions bq
       LEFT JOIN users u ON bq.submitted_by = u.id
       WHERE bq.community_id = $1 AND (bq.submitted_by = $2 OR bq.is_public = TRUE)
       ORDER BY bq.created_at DESC`,
      [communityId, userId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM board_questions WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByIdWithResponses(id) {
    const question = await pool.query(
      `SELECT bq.*, u.name as submitter_name, u.avatar_url as submitter_avatar
       FROM board_questions bq
       LEFT JOIN users u ON bq.submitted_by = u.id
       WHERE bq.id = $1`,
      [id]
    );
    if (question.rows.length === 0) return null;

    const responses = await pool.query(
      `SELECT bqr.*, u.name as responder_name, u.avatar_url as responder_avatar
       FROM board_question_responses bqr
       LEFT JOIN users u ON bqr.responded_by = u.id
       WHERE bqr.question_id = $1
       ORDER BY bqr.created_at`,
      [id]
    );

    return { ...question.rows[0], responses: responses.rows };
  },

  async setVisibility(id, isPublic) {
    const result = await pool.query(
      'UPDATE board_questions SET is_public = $1 WHERE id = $2 RETURNING *',
      [isPublic, id]
    );
    return result.rows[0];
  }
};

module.exports = BoardQuestion;
