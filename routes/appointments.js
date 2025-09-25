const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');

// GET /api/appointments - list current user's appointments, with pagination and sorting
router.get('/', async (req, res) => {
  try {
    const filter = { user: req.userId };
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const sortField = req.query.sort || 'startAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user'),
      Appointment.countDocuments(filter)
    ]);

    res.json({ items, page, limit, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/appointments/:id - get a single appointment
router.get('/:id', async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id).populate('user');
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.user?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    res.json(appt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/appointments - create an appointment
router.post('/', async (req, res) => {
  try {
    const { title, location, startAt, endAt, notes } = req.body;
    if (!title || !startAt || !endAt) {
      return res.status(400).json({ message: 'title, startAt, and endAt are required' });
    }

    const appt = new Appointment({ user: req.userId, title, location, startAt, endAt, notes });
    const saved = await appt.save();
    const populated = await saved.populate('user');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/appointments/:id - update an appointment
router.patch('/:id', async (req, res) => {
  try {
    const doc = await Appointment.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Appointment not found' });
    if (doc.user?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    const updates = {};
    const allowed = ['user', 'title', 'location', 'startAt', 'endAt', 'notes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Enforce ownership
    updates.user = req.userId;

    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('user');

    if (!updated) return res.status(404).json({ message: 'Appointment not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/appointments/:id - delete an appointment
router.delete('/:id', async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.user?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
