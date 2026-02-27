const pool = require('../config/db');

const communityAdmin = async (req, res, next) => {
  try {
    const communityId = req.params.communityId;

    const result = await pool.query(
      'SELECT role FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.user.id, communityId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this community' });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Community admin middleware error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

module.exports = communityAdmin;
