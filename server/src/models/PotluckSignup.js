const pool = require('../config/db');

const PotluckSignup = {
  async create(potluckEventId, userId, data) {
    const { dish_name, category, notes } = data;
    const result = await pool.query(
      `INSERT INTO potluck_signups (potluck_event_id, user_id, dish_name, category, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [potluckEventId, userId, dish_name, category, notes || null]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM potluck_signups WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const { dish_name, category, notes } = data;
    const result = await pool.query(
      `UPDATE potluck_signups SET dish_name=$1, category=$2, notes=$3
       WHERE id=$4 RETURNING *`,
      [dish_name, category, notes || null, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM potluck_signups WHERE id = $1', [id]);
  },

  async getCategoryCount(potluckEventId, category) {
    const result = await pool.query(
      'SELECT COUNT(*)::int as count FROM potluck_signups WHERE potluck_event_id = $1 AND category = $2',
      [potluckEventId, category]
    );
    return result.rows[0].count;
  }
};

module.exports = PotluckSignup;
