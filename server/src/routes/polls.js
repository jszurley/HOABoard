const express = require('express');
const Poll = require('../models/Poll');
const PollVote = require('../models/PollVote');
const auth = require('../middleware/auth');
const communityMember = require('../middleware/communityMember');

const router = express.Router();

// GET /:communityId/polls
router.get('/:communityId/polls', auth, communityMember, async (req, res) => {
  try {
    const polls = await Poll.findByCommunity(req.params.communityId);
    res.json(polls);
  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({ error: 'Failed to get polls' });
  }
});

// POST /:communityId/polls
router.post('/:communityId/polls', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const { question, options } = req.body;
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }

    const poll = await Poll.create(req.params.communityId, req.user.id, req.body);
    res.status(201).json(poll);
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// GET /:communityId/polls/:pollId
router.get('/:communityId/polls/:pollId', auth, communityMember, async (req, res) => {
  try {
    const poll = await Poll.findByIdWithOptions(req.params.pollId);
    if (!poll || poll.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const isBoard = req.communityRole === 'admin' || req.communityRole === 'board_member';
    const now = new Date();
    const isClosed = poll.closes_at && new Date(poll.closes_at) < now;
    const canSeeResults = isBoard || poll.results_visible === 'always' || isClosed;

    // Get user's votes
    const userVotes = await PollVote.getUserVotes(poll.id, req.user.id);

    // Get results if allowed
    let results = null;
    if (canSeeResults) {
      if (poll.is_anonymous) {
        results = await PollVote.getResults(poll.id);
      } else {
        results = await PollVote.getResultsWithVoters(poll.id);
      }
    }

    res.json({ ...poll, userVotes, results, canSeeResults });
  } catch (error) {
    console.error('Get poll error:', error);
    res.status(500).json({ error: 'Failed to get poll' });
  }
});

// PUT /:communityId/polls/:pollId
router.put('/:communityId/polls/:pollId', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const poll = await Poll.findById(req.params.pollId);
    if (!poll || poll.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const updated = await Poll.update(req.params.pollId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Update poll error:', error);
    res.status(500).json({ error: 'Failed to update poll' });
  }
});

// DELETE /:communityId/polls/:pollId
router.delete('/:communityId/polls/:pollId', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const poll = await Poll.findById(req.params.pollId);
    if (!poll || poll.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    await Poll.delete(req.params.pollId);
    res.json({ message: 'Poll deleted' });
  } catch (error) {
    console.error('Delete poll error:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// POST /:communityId/polls/:pollId/vote
router.post('/:communityId/polls/:pollId/vote', auth, communityMember, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll || poll.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const now = new Date();
    if (new Date(poll.opens_at) > now) {
      return res.status(400).json({ error: 'Poll is not open yet' });
    }
    if (poll.closes_at && new Date(poll.closes_at) < now) {
      return res.status(400).json({ error: 'Poll is closed' });
    }

    const { optionIds } = req.body;
    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one option' });
    }

    if (poll.poll_type === 'single' && optionIds.length !== 1) {
      return res.status(400).json({ error: 'Single choice poll: select exactly one option' });
    }

    // Clear previous votes and cast new ones
    await PollVote.removeUserVotes(poll.id, req.user.id);
    for (const optionId of optionIds) {
      await PollVote.castVote(poll.id, optionId, req.user.id);
    }

    res.json({ message: 'Vote recorded' });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

module.exports = router;
