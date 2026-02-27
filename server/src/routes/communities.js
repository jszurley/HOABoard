const express = require('express');
const Community = require('../models/Community');
const User = require('../models/User');
const auth = require('../middleware/auth');
const communityMember = require('../middleware/communityMember');
const communityAdmin = require('../middleware/communityAdmin');

const router = express.Router();

// GET /api/communities - Get user's communities
router.get('/', auth, async (req, res) => {
  try {
    const communities = await User.getCommunities(req.user.id);
    res.json(communities);
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({ error: 'Failed to get communities' });
  }
});

// POST /api/communities - Create a community
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const community = await Community.create(name.trim(), description, address, req.user.id);
    await Community.addMember(req.user.id, community.id, 'admin', 'accepted');

    res.status(201).json({ community });
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

// POST /api/communities/join - Join via invite code
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const community = await Community.findByInviteCode(inviteCode);
    if (!community) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const existing = await Community.getMemberStatus(req.user.id, community.id);
    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'You are already a member of this community' });
      }
      return res.status(400).json({ error: 'You already have a pending request for this community' });
    }

    await Community.addMember(req.user.id, community.id, 'resident', 'pending');

    res.json({ message: 'Request sent! The community admin will review your request.', communityName: community.name });
  } catch (error) {
    console.error('Join community error:', error);
    res.status(500).json({ error: 'Failed to join community' });
  }
});

// GET /api/communities/:communityId - Get community details with members
router.get('/:communityId', auth, communityMember, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const members = await Community.getMembers(community.id);

    res.json({ community, members });
  } catch (error) {
    console.error('Get community error:', error);
    res.status(500).json({ error: 'Failed to get community' });
  }
});

// PUT /api/communities/:communityId - Update community (admin)
router.put('/:communityId', auth, communityAdmin, async (req, res) => {
  try {
    const { name, description, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const updated = await Community.update(req.params.communityId, { name: name.trim(), description, address });
    res.json(updated);
  } catch (error) {
    console.error('Update community error:', error);
    res.status(500).json({ error: 'Failed to update community' });
  }
});

// DELETE /api/communities/:communityId - Delete community (admin)
router.delete('/:communityId', auth, communityAdmin, async (req, res) => {
  try {
    await Community.delete(req.params.communityId);
    res.json({ message: 'Community deleted' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ error: 'Failed to delete community' });
  }
});

// POST /api/communities/:communityId/regenerate-code - Regenerate invite code (admin)
router.post('/:communityId/regenerate-code', auth, communityAdmin, async (req, res) => {
  try {
    const newCode = await Community.regenerateInviteCode(req.params.communityId);
    res.json({ inviteCode: newCode });
  } catch (error) {
    console.error('Regenerate code error:', error);
    res.status(500).json({ error: 'Failed to regenerate code' });
  }
});

// GET /api/communities/:communityId/members/pending - Get pending members (admin)
router.get('/:communityId/members/pending', auth, communityAdmin, async (req, res) => {
  try {
    const pending = await Community.getPendingMembers(req.params.communityId);
    res.json(pending);
  } catch (error) {
    console.error('Get pending members error:', error);
    res.status(500).json({ error: 'Failed to get pending members' });
  }
});

// POST /api/communities/:communityId/members/:userId/accept - Accept member (admin)
router.post('/:communityId/members/:userId/accept', auth, communityAdmin, async (req, res) => {
  try {
    const member = await Community.getMemberStatus(req.params.userId, req.params.communityId);
    if (!member) {
      return res.status(404).json({ error: 'Member request not found' });
    }
    if (member.status === 'accepted') {
      return res.status(400).json({ error: 'Member is already accepted' });
    }

    await Community.updateMemberStatus(req.params.userId, req.params.communityId, 'accepted');
    res.json({ message: 'Member accepted' });
  } catch (error) {
    console.error('Accept member error:', error);
    res.status(500).json({ error: 'Failed to accept member' });
  }
});

// POST /api/communities/:communityId/members/:userId/reject - Reject member (admin)
router.post('/:communityId/members/:userId/reject', auth, communityAdmin, async (req, res) => {
  try {
    await Community.removeMember(req.params.userId, req.params.communityId);
    res.json({ message: 'Member request rejected' });
  } catch (error) {
    console.error('Reject member error:', error);
    res.status(500).json({ error: 'Failed to reject member' });
  }
});

// PUT /api/communities/:communityId/members/:userId/role - Change member role (admin)
router.put('/:communityId/members/:userId/role', auth, communityAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'board_member', 'resident'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (parseInt(req.params.userId) === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote yourself' });
    }

    await Community.updateMemberRole(req.params.userId, req.params.communityId, role);
    res.json({ message: 'Role updated' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/communities/:communityId/members/:userId - Remove member (admin)
router.delete('/:communityId/members/:userId', auth, communityAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.userId) === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself' });
    }

    await Community.removeMember(req.params.userId, req.params.communityId);
    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// POST /api/communities/:communityId/leave - Leave community
router.post('/:communityId/leave', auth, async (req, res) => {
  try {
    const member = await Community.getMemberStatus(req.user.id, req.params.communityId);
    if (!member) {
      return res.status(400).json({ error: 'You are not a member of this community' });
    }

    if (member.role === 'admin') {
      const members = await Community.getAcceptedMembers(req.params.communityId);
      const admins = members.filter(m => m.role === 'admin');
      if (admins.length <= 1) {
        return res.status(400).json({ error: 'You are the only admin. Promote another member before leaving.' });
      }
    }

    await Community.removeMember(req.user.id, req.params.communityId);
    res.json({ message: 'Left community' });
  } catch (error) {
    console.error('Leave community error:', error);
    res.status(500).json({ error: 'Failed to leave community' });
  }
});

module.exports = router;
