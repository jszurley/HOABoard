const pool = require('../config/db');

const communityMember = async (req, res, next) => {
  try {
    const communityId = req.params.communityId;

    const result = await pool.query(
      "SELECT role, status FROM community_members WHERE user_id = $1 AND community_id = $2 AND status = 'accepted'",
      [req.user.id, communityId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this community' });
    }

    req.communityRole = result.rows[0].role;
    next();
  } catch (error) {
    console.error('Community member middleware error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

module.exports = communityMember;
