const express = require('express');
const BoardQuestion = require('../models/BoardQuestion');
const BoardQuestionResponse = require('../models/BoardQuestionResponse');
const auth = require('../middleware/auth');
const communityMember = require('../middleware/communityMember');

const { moderateContent } = require('../utils/contentModeration');

const router = express.Router();

// GET /:communityId/questions
router.get('/:communityId/questions', auth, communityMember, async (req, res) => {
  try {
    const isBoard = req.communityRole === 'admin' || req.communityRole === 'board_member';
    let questions;
    if (isBoard) {
      questions = await BoardQuestion.findByCommunityForBoard(req.params.communityId);
    } else {
      questions = await BoardQuestion.findByCommunityForResident(req.params.communityId, req.user.id);
    }
    res.json(questions);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// POST /:communityId/questions
router.post('/:communityId/questions', auth, communityMember, async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Run content moderation — flag inappropriate content and force private
    const moderation = moderateContent(title, message);
    const questionData = {
      ...req.body,
      flagged: moderation.flagged,
      flag_reason: moderation.flagged ? moderation.reasons.join('; ') : null,
    };

    const question = await BoardQuestion.create(req.params.communityId, req.user.id, questionData);
    res.status(201).json(question);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Failed to submit question' });
  }
});

// GET /:communityId/questions/archived (admin only — must be before :questionId)
router.get('/:communityId/questions/archived', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const questions = await BoardQuestion.findArchivedByCommunity(req.params.communityId);
    res.json(questions);
  } catch (error) {
    console.error('Get archived questions error:', error);
    res.status(500).json({ error: 'Failed to get archived questions' });
  }
});

// GET /:communityId/questions/:questionId
router.get('/:communityId/questions/:questionId', auth, communityMember, async (req, res) => {
  try {
    const question = await BoardQuestion.findByIdWithResponses(req.params.questionId);
    if (!question || question.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const isBoard = req.communityRole === 'admin' || req.communityRole === 'board_member';
    if (!isBoard && question.submitted_by !== req.user.id && !question.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(question);
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// POST /:communityId/questions/:questionId/responses
router.post('/:communityId/questions/:questionId/responses', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const { message, isPublic } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const question = await BoardQuestion.findById(req.params.questionId);
    if (!question || question.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const response = await BoardQuestionResponse.create(req.params.questionId, req.user.id, message, isPublic);

    // If response is public, also make the question public (unless flagged)
    if (isPublic && !question.flagged) {
      await BoardQuestion.setVisibility(req.params.questionId, true);
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Create response error:', error);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

// PUT /:communityId/questions/:questionId/archive (admin only)
router.put('/:communityId/questions/:questionId/archive', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const question = await BoardQuestion.findById(req.params.questionId);
    if (!question || question.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const { archived } = req.body;
    const updated = archived
      ? await BoardQuestion.archive(req.params.questionId)
      : await BoardQuestion.unarchive(req.params.questionId);
    res.json(updated);
  } catch (error) {
    console.error('Archive question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /:communityId/questions/:questionId (admin only)
router.delete('/:communityId/questions/:questionId', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const question = await BoardQuestion.findById(req.params.questionId);
    if (!question || question.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Question not found' });
    }
    await BoardQuestion.delete(req.params.questionId);
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// PUT /:communityId/questions/:questionId/visibility
router.put('/:communityId/questions/:questionId/visibility', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const { isPublic } = req.body;
    const question = await BoardQuestion.findById(req.params.questionId);
    if (!question || question.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Prevent making flagged questions public
    if (question.flagged && isPublic) {
      return res.status(400).json({ error: 'Cannot make a flagged question public. The content was flagged by moderation for: ' + (question.flag_reason || 'policy violation') });
    }

    const updated = await BoardQuestion.setVisibility(req.params.questionId, isPublic);
    res.json(updated);
  } catch (error) {
    console.error('Update visibility error:', error);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

module.exports = router;
