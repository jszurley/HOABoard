const express = require('express');
const PotluckEvent = require('../models/PotluckEvent');
const PotluckSignup = require('../models/PotluckSignup');
const auth = require('../middleware/auth');
const communityMember = require('../middleware/communityMember');
const communityAdmin = require('../middleware/communityAdmin');

const router = express.Router();

// GET /:communityId/potlucks
router.get('/:communityId/potlucks', auth, communityMember, async (req, res) => {
  try {
    const events = await PotluckEvent.findByCommunity(req.params.communityId);
    res.json(events);
  } catch (error) {
    console.error('Get potlucks error:', error);
    res.status(500).json({ error: 'Failed to get potluck events' });
  }
});

// POST /:communityId/potlucks
router.post('/:communityId/potlucks', auth, communityAdmin, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const event = await PotluckEvent.create(req.params.communityId, req.user.id, req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('Create potluck error:', error);
    res.status(500).json({ error: 'Failed to create potluck event' });
  }
});

// GET /:communityId/potlucks/:potluckId
router.get('/:communityId/potlucks/:potluckId', auth, communityMember, async (req, res) => {
  try {
    const event = await PotluckEvent.findByIdWithSignups(req.params.potluckId);
    if (!event || event.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Potluck event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Get potluck error:', error);
    res.status(500).json({ error: 'Failed to get potluck event' });
  }
});

// PUT /:communityId/potlucks/:potluckId
router.put('/:communityId/potlucks/:potluckId', auth, communityAdmin, async (req, res) => {
  try {
    const event = await PotluckEvent.findById(req.params.potluckId);
    if (!event || event.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Potluck event not found' });
    }
    const updated = await PotluckEvent.update(req.params.potluckId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Update potluck error:', error);
    res.status(500).json({ error: 'Failed to update potluck event' });
  }
});

// DELETE /:communityId/potlucks/:potluckId
router.delete('/:communityId/potlucks/:potluckId', auth, communityAdmin, async (req, res) => {
  try {
    const event = await PotluckEvent.findById(req.params.potluckId);
    if (!event || event.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Potluck event not found' });
    }
    await PotluckEvent.delete(req.params.potluckId);
    res.json({ message: 'Potluck event deleted' });
  } catch (error) {
    console.error('Delete potluck error:', error);
    res.status(500).json({ error: 'Failed to delete potluck event' });
  }
});

// POST /:communityId/potlucks/:potluckId/signups
router.post('/:communityId/potlucks/:potluckId/signups', auth, communityMember, async (req, res) => {
  try {
    const { dishName, category } = req.body;
    if (!dishName || !category) {
      return res.status(400).json({ error: 'Dish name and category are required' });
    }

    const event = await PotluckEvent.findById(req.params.potluckId);
    if (!event || event.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Potluck event not found' });
    }

    // Check category limit
    const limitMap = { appetizer: 'max_appetizers', side: 'max_sides', main: 'max_mains', dessert: 'max_desserts', drinks: 'max_drinks', other: 'max_other' };
    const limit = event[limitMap[category]];
    if (limit !== null && limit !== undefined) {
      const count = await PotluckSignup.getCategoryCount(req.params.potluckId, category);
      if (count >= limit) {
        return res.status(400).json({ error: `Maximum ${category} signups (${limit}) reached` });
      }
    }

    const signup = await PotluckSignup.create(req.params.potluckId, req.user.id, req.body);
    res.status(201).json(signup);
  } catch (error) {
    console.error('Create signup error:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

// PUT /:communityId/potlucks/:potluckId/signups/:signupId
router.put('/:communityId/potlucks/:potluckId/signups/:signupId', auth, communityMember, async (req, res) => {
  try {
    const signup = await PotluckSignup.findById(req.params.signupId);
    if (!signup || signup.potluck_event_id !== parseInt(req.params.potluckId)) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    if (signup.user_id !== req.user.id && req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own signups' });
    }

    const updated = await PotluckSignup.update(req.params.signupId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Update signup error:', error);
    res.status(500).json({ error: 'Failed to update signup' });
  }
});

// DELETE /:communityId/potlucks/:potluckId/signups/:signupId
router.delete('/:communityId/potlucks/:potluckId/signups/:signupId', auth, communityMember, async (req, res) => {
  try {
    const signup = await PotluckSignup.findById(req.params.signupId);
    if (!signup || signup.potluck_event_id !== parseInt(req.params.potluckId)) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    if (signup.user_id !== req.user.id && req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own signups' });
    }

    await PotluckSignup.delete(req.params.signupId);
    res.json({ message: 'Signup removed' });
  } catch (error) {
    console.error('Delete signup error:', error);
    res.status(500).json({ error: 'Failed to delete signup' });
  }
});

module.exports = router;
