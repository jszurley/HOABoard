const pool = require('../config/db');
const crypto = require('crypto');

const Community = {
  generateInviteCode() {
    return crypto.randomBytes(5).toString('hex').toUpperCase();
  },

  async create(name, description, address, createdBy) {
    const inviteCode = this.generateInviteCode();
    const result = await pool.query(
      `INSERT INTO communities (name, description, address, invite_code, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || null, address || null, inviteCode, createdBy]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM communities WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByInviteCode(code) {
    const result = await pool.query(
      'SELECT * FROM communities WHERE invite_code = $1',
      [code.toUpperCase()]
    );
    return result.rows[0];
  },

  async update(id, { name, description, address }) {
    const result = await pool.query(
      `UPDATE communities SET name = $1, description = $2, address = $3
       WHERE id = $4 RETURNING *`,
      [name, description || null, address || null, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM communities WHERE id = $1', [id]);
  },

  async addMember(userId, communityId, role = 'resident', status = 'pending') {
    await pool.query(
      `INSERT INTO community_members (user_id, community_id, role, status)
       VALUES ($1, $2, $3, $4)`,
      [userId, communityId, role, status]
    );
  },

  async removeMember(userId, communityId) {
    await pool.query(
      'DELETE FROM community_members WHERE user_id = $1 AND community_id = $2',
      [userId, communityId]
    );
  },

  async getMemberStatus(userId, communityId) {
    const result = await pool.query(
      'SELECT * FROM community_members WHERE user_id = $1 AND community_id = $2',
      [userId, communityId]
    );
    return result.rows[0];
  },

  async getMembers(communityId) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, cm.role, cm.status, cm.joined_at
       FROM users u
       INNER JOIN community_members cm ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'accepted'
       ORDER BY cm.role, u.name`,
      [communityId]
    );
    return result.rows;
  },

  async getAcceptedMembers(communityId) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, cm.role
       FROM users u
       INNER JOIN community_members cm ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'accepted'`,
      [communityId]
    );
    return result.rows;
  },

  async getPendingMembers(communityId) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, cm.joined_at
       FROM users u
       INNER JOIN community_members cm ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'pending'
       ORDER BY cm.joined_at`,
      [communityId]
    );
    return result.rows;
  },

  async updateMemberStatus(userId, communityId, status) {
    await pool.query(
      'UPDATE community_members SET status = $1 WHERE user_id = $2 AND community_id = $3',
      [status, userId, communityId]
    );
  },

  async updateMemberRole(userId, communityId, role) {
    await pool.query(
      'UPDATE community_members SET role = $1 WHERE user_id = $2 AND community_id = $3',
      [role, userId, communityId]
    );
  },

  async regenerateInviteCode(communityId) {
    const newCode = this.generateInviteCode();
    const result = await pool.query(
      'UPDATE communities SET invite_code = $1 WHERE id = $2 RETURNING invite_code',
      [newCode, communityId]
    );
    return result.rows[0].invite_code;
  }
};

module.exports = Community;
