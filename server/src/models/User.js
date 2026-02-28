const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async create(email, password, name) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, avatar_url, created_at`,
      [email, passwordHash, name]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, email, name, avatar_url, phone, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async updateProfile(id, { name, email, phone }) {
    const result = await pool.query(
      `UPDATE users SET name = $1, email = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, name, avatar_url, phone, created_at, updated_at`,
      [name, email.toLowerCase(), phone || null, id]
    );
    return result.rows[0];
  },

  async updatePassword(id, newPassword) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, id]
    );
  },

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  async setResetToken(email, tokenHash, expires) {
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [tokenHash, expires, email.toLowerCase()]
    );
  },

  async findByResetToken(tokenHash) {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [tokenHash]
    );
    return result.rows[0];
  },

  async clearResetToken(id) {
    await pool.query(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1',
      [id]
    );
  },

  async getCommunities(userId) {
    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.address, c.invite_code, c.created_at,
              cm.role, cm.status
       FROM communities c
       INNER JOIN community_members cm ON c.id = cm.community_id
       WHERE cm.user_id = $1 AND cm.status = 'accepted'
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  }
};

module.exports = User;
