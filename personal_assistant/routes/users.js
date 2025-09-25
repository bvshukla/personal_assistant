const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const FollowUpItem = require('../models/FollowUpItem');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/summary - convenience endpoint for the current user (uses req.userId)
router.get('/summary', async (req, res) => {
  try {
    const userId = req.userId;

    // Pagination and sorting for appointments
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const sortField = req.query.sort || 'startAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    // Pagination and sorting for follow-ups
    const fupPage = Math.max(parseInt(req.query.fupPage || '1', 10), 1);
    const fupLimit = Math.min(Math.max(parseInt(req.query.fupLimit || '20', 10), 1), 100);
    const fupSortField = req.query.fupSort || 'createdAt';
    const fupSortOrder = req.query.fupOrder === 'asc' ? 1 : -1;

    const [appointments, apptTotal] = await Promise.all([
      Appointment.find({ user: userId })
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user'),
      Appointment.countDocuments({ user: userId })
    ]);

    const apptIds = appointments.map(a => a._id);

    const [followups, fupTotal] = await Promise.all([
      FollowUpItem.find({ appointment: { $in: apptIds } })
        .sort({ [fupSortField]: fupSortOrder })
        .skip((fupPage - 1) * fupLimit)
        .limit(fupLimit)
        .populate('appointment')
        .populate('assignee'),
      FollowUpItem.countDocuments({ appointment: { $in: apptIds } })
    ]);

    res.json({
      appointments: { items: appointments, page, limit, total: apptTotal },
      followups: { items: followups, page: fupPage, limit: fupLimit, total: fupTotal }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
// Create a new user
router.post('/', async (req, res) => {
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
  });

  try {
    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
 
// GET /api/users/:id/summary - list appointments and follow-ups for a given user
// Auth: only the user themself can access
router.get('/:id/summary', async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Pagination and sorting for appointments
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const sortField = req.query.sort || 'startAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    // Pagination and sorting for follow-ups
    const fupPage = Math.max(parseInt(req.query.fupPage || '1', 10), 1);
    const fupLimit = Math.min(Math.max(parseInt(req.query.fupLimit || '20', 10), 1), 100);
    const fupSortField = req.query.fupSort || 'createdAt';
    const fupSortOrder = req.query.fupOrder === 'asc' ? 1 : -1;

    // Get appointments for the user
    const [appointments, apptTotal] = await Promise.all([
      Appointment.find({ user: userId })
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user'),
      Appointment.countDocuments({ user: userId })
    ]);

    // Collect all appointment IDs to fetch follow-ups
    const apptIds = appointments.map(a => a._id);

    const [followups, fupTotal] = await Promise.all([
      FollowUpItem.find({ appointment: { $in: apptIds } })
        .sort({ [fupSortField]: fupSortOrder })
        .skip((fupPage - 1) * fupLimit)
        .limit(fupLimit)
        .populate('appointment')
        .populate('assignee'),
      FollowUpItem.countDocuments({ appointment: { $in: apptIds } })
    ]);

    res.json({
      appointments: { items: appointments, page, limit, total: apptTotal },
      followups: { items: followups, page: fupPage, limit: fupLimit, total: fupTotal }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
