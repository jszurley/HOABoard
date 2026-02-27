const pool = require('../config/db');

const Poll = {
  async create(communityId, createdBy, data) {
    const { question, pollType, isAnonymous, resultsVisible, opensAt, closesAt, options } = data;
    const result = await pool.query(
      `INSERT INTO polls (community_id, created_by, question, poll_type, is_anonymous, results_visible, opens_at, closes_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [communityId, createdBy, question, pollType || 'single', isAnonymous || false, resultsVisible || 'after_close', opensAt || new Date(), closesAt || null]
    );

    const poll = result.rows[0];

    if (options && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        await pool.query(
          'INSERT INTO poll_options (poll_id, option_text, display_order) VALUES ($1, $2, $3)',
          [poll.id, options[i], i]
        );
      }
    }

    return poll;
  },

  async findByCommunity(communityId) {
    const result = await pool.query(
      `SELECT p.*, u.name as creator_name,
              (SELECT COUNT(DISTINCT pv.user_id) FROM poll_votes pv WHERE pv.poll_id = p.id)::int as vote_count
       FROM polls p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.community_id = $1
       ORDER BY p.created_at DESC`,
      [communityId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM polls WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByIdWithOptions(id) {
    const poll = await pool.query(
      `SELECT p.*, u.name as creator_name
       FROM polls p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );
    if (poll.rows.length === 0) return null;

    const options = await pool.query(
      `SELECT po.*, (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id)::int as vote_count
       FROM poll_options po
       WHERE po.poll_id = $1
       ORDER BY po.display_order`,
      [id]
    );

    const participation = await pool.query(
      'SELECT COUNT(DISTINCT user_id)::int as count FROM poll_votes WHERE poll_id = $1',
      [id]
    );

    return {
      ...poll.rows[0],
      options: options.rows,
      participationCount: participation.rows[0].count
    };
  },

  async update(id, data) {
    const { question, pollType, isAnonymous, resultsVisible, opensAt, closesAt } = data;
    const result = await pool.query(
      `UPDATE polls SET question=$1, poll_type=$2, is_anonymous=$3, results_visible=$4, opens_at=$5, closes_at=$6
       WHERE id=$7 RETURNING *`,
      [question, pollType, isAnonymous, resultsVisible, opensAt, closesAt || null, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM polls WHERE id = $1', [id]);
  }
};

module.exports = Poll;
