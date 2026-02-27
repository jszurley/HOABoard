const pool = require('../config/db');

const PollVote = {
  async castVote(pollId, optionId, userId) {
    const result = await pool.query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, option_id, user_id) DO NOTHING
       RETURNING *`,
      [pollId, optionId, userId]
    );
    return result.rows[0];
  },

  async removeUserVotes(pollId, userId) {
    await pool.query(
      'DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, userId]
    );
  },

  async hasVoted(pollId, userId) {
    const result = await pool.query(
      'SELECT 1 FROM poll_votes WHERE poll_id = $1 AND user_id = $2 LIMIT 1',
      [pollId, userId]
    );
    return result.rows.length > 0;
  },

  async getUserVotes(pollId, userId) {
    const result = await pool.query(
      'SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, userId]
    );
    return result.rows.map(r => r.option_id);
  },

  async getResults(pollId) {
    const result = await pool.query(
      `SELECT po.id, po.option_text, po.display_order,
              COUNT(pv.id)::int as vote_count
       FROM poll_options po
       LEFT JOIN poll_votes pv ON po.id = pv.option_id
       WHERE po.poll_id = $1
       GROUP BY po.id
       ORDER BY po.display_order`,
      [pollId]
    );
    return result.rows;
  },

  async getResultsWithVoters(pollId) {
    const options = await pool.query(
      `SELECT po.id, po.option_text, po.display_order,
              COUNT(pv.id)::int as vote_count
       FROM poll_options po
       LEFT JOIN poll_votes pv ON po.id = pv.option_id
       WHERE po.poll_id = $1
       GROUP BY po.id
       ORDER BY po.display_order`,
      [pollId]
    );

    for (const option of options.rows) {
      const voters = await pool.query(
        `SELECT u.id, u.name, u.avatar_url
         FROM poll_votes pv
         JOIN users u ON pv.user_id = u.id
         WHERE pv.option_id = $1`,
        [option.id]
      );
      option.voters = voters.rows;
    }

    return options.rows;
  },

  async getParticipationCount(pollId) {
    const result = await pool.query(
      'SELECT COUNT(DISTINCT user_id)::int as count FROM poll_votes WHERE poll_id = $1',
      [pollId]
    );
    return result.rows[0].count;
  }
};

module.exports = PollVote;
