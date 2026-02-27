const pool = require('../config/db');

const CalendarEvent = {
  async create(communityId, createdBy, data) {
    const { title, description, event_date, start_time, end_time, location, event_type } = data;
    const result = await pool.query(
      `INSERT INTO calendar_events (community_id, created_by, title, description, event_date, start_time, end_time, location, event_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [communityId, createdBy, title, description || null, event_date, start_time || null, end_time || null, location || null, event_type || 'meeting']
    );
    return result.rows[0];
  },

  async findByCommunity(communityId) {
    const result = await pool.query(
      `SELECT ce.*, u.name as creator_name
       FROM calendar_events ce
       LEFT JOIN users u ON ce.created_by = u.id
       WHERE ce.community_id = $1
       ORDER BY ce.event_date, ce.start_time`,
      [communityId]
    );
    return result.rows;
  },

  async findByCommunityAndMonth(communityId, startDate, endDate) {
    const result = await pool.query(
      `SELECT ce.*, u.name as creator_name
       FROM calendar_events ce
       LEFT JOIN users u ON ce.created_by = u.id
       WHERE ce.community_id = $1 AND ce.event_date >= $2 AND ce.event_date <= $3
       ORDER BY ce.event_date, ce.start_time`,
      [communityId, startDate, endDate]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const { title, description, event_date, start_time, end_time, location, event_type } = data;
    const result = await pool.query(
      `UPDATE calendar_events SET title=$1, description=$2, event_date=$3, start_time=$4, end_time=$5, location=$6, event_type=$7
       WHERE id=$8 RETURNING *`,
      [title, description || null, event_date, start_time || null, end_time || null, location || null, event_type || 'meeting', id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [id]);
  }
};

module.exports = CalendarEvent;
