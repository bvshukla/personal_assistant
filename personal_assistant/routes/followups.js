const express = require('express');
const router = express.Router({ mergeParams: true });
const FollowUpItem = require('../models/FollowUpItem');
const Appointment = require('../models/Appointment');

// Helper to build filter supporting both top-level and nested routes
function buildFilter(req) {
  const filter = {};
  if (req.query.appointment) filter.appointment = req.query.appointment;
  if (req.params.appointmentId) filter.appointment = req.params.appointmentId;
  if (req.query.assignee) filter.assignee = req.query.assignee;
  if (req.query.completed !== undefined) filter.completed = req.query.completed === 'true';
  return filter;
}

// GET /api/followups and GET /api/appointments/:appointmentId/followups
router.get(['/', '/'], async (req, res) => {
  try {
    const filter = buildFilter(req);

    // If no explicit appointment filter and not nested, restrict to current user's appointments
    let appointmentIds = null;
    if (!filter.appointment) {
      const appts = await Appointment.find({ user: req.userId }).select('_id');
      appointmentIds = appts.map(a => a._id);
      filter.appointment = { $in: appointmentIds };
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const sortField = req.query.sort || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      FollowUpItem.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('appointment')
        .populate('assignee'),
      FollowUpItem.countDocuments(filter)
    ]);

    res.json({ items, page, limit, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/followups/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await FollowUpItem.findById(req.params.id)
      .populate({ path: 'appointment', select: 'user title startAt endAt' })
      .populate('assignee');
    if (!item) return res.status(404).json({ message: 'Follow-up not found' });
    if (item.appointment?.user?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/followups and POST /api/appointments/:appointmentId/followups
router.post(['/', '/'], async (req, res) => {
  try {
    const body = { ...req.body };
    // support nested route default for appointmentId
    if (req.params.appointmentId) body.appointment = req.params.appointmentId;

    const { appointment, title } = body;
    if (!appointment || !title) {
      return res.status(400).json({ message: 'appointment and title are required' });
    }

    // Authorization: appointment must belong to current user
    const appt = await Appointment.findById(appointment).select('user');
    if (!appt) return res.status(400).json({ message: 'Invalid appointment' });
    if (appt.user?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    const created = await FollowUpItem.create(body);
    const populated = await created.populate('appointment').populate('assignee');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/followups/:id - update fields; if completed flips to true, completedAt handled by pre-save
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['title', 'description', 'assignee', 'dueAt', 'completed'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

    // Need document middleware to trigger pre('save') for completedAt logic
    const doc = await FollowUpItem.findById(req.params.id).populate({ path: 'appointment', select: 'user' });
    if (!doc) return res.status(404).json({ message: 'Follow-up not found' });
    if (doc.appointment?.user?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    Object.assign(doc, updates);
    const saved = await doc.save();
    const populated = await saved.populate('appointment').populate('assignee');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/followups/:id
router.delete('/:id', async (req, res) => {
  try {
    const doc = await FollowUpItem.findById(req.params.id).populate({ path: 'appointment', select: 'user' });
    if (!doc) return res.status(404).json({ message: 'Follow-up not found' });
    if (doc.appointment?.user?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    const deleted = await FollowUpItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Follow-up not found' });
    res.json({ message: 'Follow-up deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
