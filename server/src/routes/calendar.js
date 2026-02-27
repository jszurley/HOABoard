const express = require('express');
const CalendarEvent = require('../models/CalendarEvent');
const auth = require('../middleware/auth');
const communityMember = require('../middleware/communityMember');

const router = express.Router();

// GET /:communityId/calendar
router.get('/:communityId/calendar', auth, communityMember, async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    let events;
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const startDate = new Date(year, mon - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, mon, 0).toISOString().split('T')[0];
      events = await CalendarEvent.findByCommunityAndMonth(req.params.communityId, startDate, endDate);
    } else {
      events = await CalendarEvent.findByCommunity(req.params.communityId);
    }
    res.json(events);
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

// POST /:communityId/calendar
router.post('/:communityId/calendar', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const { title, eventDate, startTime } = req.body;
    if (!title || !eventDate || !startTime) {
      return res.status(400).json({ error: 'Title, date, and start time are required' });
    }

    const event = await CalendarEvent.create(req.params.communityId, req.user.id, req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /:communityId/calendar/:eventId
router.put('/:communityId/calendar/:eventId', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const event = await CalendarEvent.findById(req.params.eventId);
    if (!event || event.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updated = await CalendarEvent.update(req.params.eventId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /:communityId/calendar/:eventId
router.delete('/:communityId/calendar/:eventId', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin' && req.communityRole !== 'board_member') {
      return res.status(403).json({ error: 'Board member access required' });
    }

    const event = await CalendarEvent.findById(req.params.eventId);
    if (!event || event.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await CalendarEvent.delete(req.params.eventId);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
