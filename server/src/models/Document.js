const pool = require('../config/db');

const Document = {
  async create(communityId, uploadedBy, { name, filename, mime_type, file_data, file_size }) {
    const result = await pool.query(
      `INSERT INTO community_documents (community_id, uploaded_by, name, filename, mime_type, file_data, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, community_id, name, filename, mime_type, file_size, uploaded_by, created_at`,
      [communityId, uploadedBy, name, filename, mime_type, file_data, file_size]
    );
    return result.rows[0];
  },

  async findByCommunity(communityId) {
    const result = await pool.query(
      `SELECT d.id, d.community_id, d.name, d.filename, d.mime_type, d.file_size, d.uploaded_by, d.created_at,
              u.name as uploader_name
       FROM community_documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.community_id = $1
       ORDER BY d.created_at DESC`,
      [communityId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM community_documents WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM community_documents WHERE id = $1', [id]);
  }
};

module.exports = Document;
