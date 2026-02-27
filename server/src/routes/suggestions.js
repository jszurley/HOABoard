const express = require('express');
const MeetingSuggestion = require('../models/MeetingSuggestion');
const auth = require('../middleware/auth');
const communityMember = require('../middleware/communityMember');
const boardMember = require('../middleware/boardMember');

const router = express.Router();

// GET /:communityId/suggestions
router.get('/:communityId/suggestions', auth, communityMember, async (req, res) => {
  try {
    const suggestions = await MeetingSuggestion.findByCommunity(req.params.communityId, req.user.id);
    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// POST /:communityId/suggestions
router.post('/:communityId/suggestions', auth, communityMember, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const suggestion = await MeetingSuggestion.create(req.params.communityId, req.user.id, req.body);
    res.status(201).json(suggestion);
  } catch (error) {
    console.error('Create suggestion error:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
});

// PUT /:communityId/suggestions/:suggestionId
router.put('/:communityId/suggestions/:suggestionId', auth, communityMember, async (req, res) => {
  try {
    const suggestion = await MeetingSuggestion.findById(req.params.suggestionId);
    if (!suggestion || suggestion.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    if (suggestion.submitted_by !== req.user.id && req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own suggestions' });
    }
    const updated = await MeetingSuggestion.update(req.params.suggestionId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// DELETE /:communityId/suggestions/:suggestionId
router.delete('/:communityId/suggestions/:suggestionId', auth, communityMember, async (req, res) => {
  try {
    const suggestion = await MeetingSuggestion.findById(req.params.suggestionId);
    if (!suggestion || suggestion.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    if (suggestion.submitted_by !== req.user.id && req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'You can only delete your own suggestions' });
    }
    await MeetingSuggestion.delete(req.params.suggestionId);
    res.json({ message: 'Suggestion deleted' });
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
});

// PUT /:communityId/suggestions/:suggestionId/status
router.put('/:communityId/suggestions/:suggestionId/status', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }
    const { status } = req.body;
    if (!['submitted', 'added_to_agenda', 'reviewed', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const suggestion = await MeetingSuggestion.findById(req.params.suggestionId);
    if (!suggestion || suggestion.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    const updated = await MeetingSuggestion.updateStatus(req.params.suggestionId, status, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Update suggestion status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /:communityId/suggestions/:suggestionId/upvote
router.post('/:communityId/suggestions/:suggestionId/upvote', auth, communityMember, async (req, res) => {
  try {
    const suggestion = await MeetingSuggestion.findById(req.params.suggestionId);
    if (!suggestion || suggestion.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    const upvoted = await MeetingSuggestion.toggleUpvote(req.params.suggestionId, req.user.id);
    res.json({ upvoted });
  } catch (error) {
    console.error('Toggle upvote error:', error);
    res.status(500).json({ error: 'Failed to toggle upvote' });
  }
});

module.exports = router;
