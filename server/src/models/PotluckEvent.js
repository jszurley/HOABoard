const pool = require('../config/db');

const PotluckEvent = {
  async create(communityId, createdBy, data) {
    const { title, theme, description, event_date, event_time, location, max_appetizers, max_sides, max_mains, max_desserts, max_drinks, max_other } = data;
    const result = await pool.query(
      `INSERT INTO potluck_events (community_id, created_by, title, theme, description, event_date, event_time, location, max_appetizers, max_sides, max_mains, max_desserts, max_drinks, max_other)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [communityId, createdBy, title, theme || null, description || null, event_date, event_time || null, location || null, max_appetizers || null, max_sides || null, max_mains || null, max_desserts || null, max_drinks || null, max_other || null]
    );
    return result.rows[0];
  },

  async findByCommunity(communityId) {
    const result = await pool.query(
      `SELECT pe.*, u.name as creator_name,
              (SELECT COUNT(*) FROM potluck_signups WHERE potluck_event_id = pe.id)::int as signup_count
       FROM potluck_events pe
       LEFT JOIN users u ON pe.created_by = u.id
       WHERE pe.community_id = $1
       ORDER BY pe.event_date DESC`,
      [communityId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM potluck_events WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByIdWithSignups(id) {
    const event = await pool.query(
      `SELECT pe.*, u.name as creator_name
       FROM potluck_events pe
       LEFT JOIN users u ON pe.created_by = u.id
       WHERE pe.id = $1`,
      [id]
    );
    if (event.rows.length === 0) return null;

    const signups = await pool.query(
      `SELECT ps.*, u.name as user_name, u.avatar_url
       FROM potluck_signups ps
       LEFT JOIN users u ON ps.user_id = u.id
       WHERE ps.potluck_event_id = $1
       ORDER BY ps.category, ps.created_at`,
      [id]
    );

    return { ...event.rows[0], signups: signups.rows };
  },

  async update(id, data) {
    const { title, theme, description, event_date, event_time, location, max_appetizers, max_sides, max_mains, max_desserts, max_drinks, max_other } = data;
    const result = await pool.query(
      `UPDATE potluck_events SET title=$1, theme=$2, description=$3, event_date=$4, event_time=$5, location=$6, max_appetizers=$7, max_sides=$8, max_mains=$9, max_desserts=$10, max_drinks=$11, max_other=$12
       WHERE id=$13 RETURNING *`,
      [title, theme || null, description || null, event_date, event_time || null, location || null, max_appetizers || null, max_sides || null, max_mains || null, max_desserts || null, max_drinks || null, max_other || null, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM potluck_events WHERE id = $1', [id]);
  }
};

module.exports = PotluckEvent;
