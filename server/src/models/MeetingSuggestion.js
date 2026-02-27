const pool = require('../config/db');

const MeetingSuggestion = {
  async create(communityId, submittedBy, data) {
    const { title, description } = data;
    const result = await pool.query(
      `INSERT INTO meeting_suggestions (community_id, submitted_by, title, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [communityId, submittedBy, title, description || null]
    );
    return result.rows[0];
  },

  async findByCommunity(communityId, userId) {
    const result = await pool.query(
      `SELECT ms.*, u.name as submitter_name, u.avatar_url as submitter_avatar,
              (SELECT COUNT(*) FROM suggestion_upvotes WHERE suggestion_id = ms.id)::int as upvote_count,
              EXISTS(SELECT 1 FROM suggestion_upvotes WHERE suggestion_id = ms.id AND user_id = $2) as user_upvoted
       FROM meeting_suggestions ms
       LEFT JOIN users u ON ms.submitted_by = u.id
       WHERE ms.community_id = $1
       ORDER BY upvote_count DESC, ms.created_at DESC`,
      [communityId, userId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM meeting_suggestions WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const { title, description } = data;
    const result = await pool.query(
      'UPDATE meeting_suggestions SET title=$1, description=$2 WHERE id=$3 RETURNING *',
      [title, description || null, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM meeting_suggestions WHERE id = $1', [id]);
  },

  async updateStatus(id, status, updatedBy) {
    const result = await pool.query(
      'UPDATE meeting_suggestions SET status=$1, status_updated_by=$2 WHERE id=$3 RETURNING *',
      [status, updatedBy, id]
    );
    return result.rows[0];
  },

  async toggleUpvote(suggestionId, userId) {
    const existing = await pool.query(
      'SELECT 1 FROM suggestion_upvotes WHERE user_id = $1 AND suggestion_id = $2',
      [userId, suggestionId]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM suggestion_upvotes WHERE user_id = $1 AND suggestion_id = $2',
        [userId, suggestionId]
      );
      return false;
    } else {
      await pool.query(
        'INSERT INTO suggestion_upvotes (user_id, suggestion_id) VALUES ($1, $2)',
        [userId, suggestionId]
      );
      return true;
    }
  }
};

module.exports = MeetingSuggestion;
