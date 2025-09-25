const express = require('express');
const router = express.Router();
const Team = require('../models/Team');

// GET /api/teams - list teams, optional filters: owner, member
router.get('/', async (req, res) => {
  try {
    let filter = {};
    if (req.query.owner) filter.owner = req.query.owner;
    if (req.query.member) filter.members = req.query.member; // teams containing member
    // Default: teams I own or I am a member of
    if (!req.query.owner && !req.query.member) {
      filter = { $or: [{ owner: req.userId }, { members: req.userId }] };
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const sortField = req.query.sort || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Team.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('owner')
        .populate('members'),
      Team.countDocuments(filter)
    ]);

    res.json({ items, page, limit, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teams/:id - fetch a single team
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner')
      .populate('members');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/teams - create a team
router.post('/', async (req, res) => {
  try {
    const { name, description, owner, members } = req.body;
    if (!name || !owner) {
      return res.status(400).json({ message: 'name and owner are required' });
    }

    // Only allow creating a team for oneself
    if (owner !== req.userId) {
      return res.status(403).json({ message: 'Forbidden: can only create teams for yourself as owner' });
    }

    // Ensure owner is always a member
    const uniqueMembers = new Set([owner, ...(members || [])]);
    const team = new Team({ name, description, owner, members: Array.from(uniqueMembers) });
    const saved = await team.save();
    const populated = await saved.populate('owner').populate('members');
    res.status(201).json(populated);
  } catch (err) {
    // Unique index on (owner, name) can trigger errors
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/teams/:id - update team fields (not members list modifications)
router.patch('/:id', async (req, res) => {
  try {
    // Only owner can update
    const current = await Team.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Team not found' });
    if (current.owner?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    const updates = {};
    const allowed = ['name', 'description', 'owner'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // If owner is changing, ensure new owner is in members as well
    let updated;
    if (updates.owner) {
      // Only current owner can transfer ownership (already checked)
      updated = await Team.findByIdAndUpdate(
        req.params.id,
        {
          $set: updates,
          $addToSet: { members: updates.owner }
        },
        { new: true, runValidators: true }
      ).populate('owner').populate('members');
    } else {
      updated = await Team.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('owner').populate('members');
    }

    if (!updated) return res.status(404).json({ message: 'Team not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/teams/:id/members - add one or many members
router.post('/:id/members', async (req, res) => {
  try {
    // Only owner can add members
    const current = await Team.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Team not found' });
    if (current.owner?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    const { members } = req.body; // array or single id
    const toAdd = Array.isArray(members) ? members : [members];
    if (!toAdd || toAdd.length === 0) {
      return res.status(400).json({ message: 'members is required (array or id)' });
    }

    const updated = await Team.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: { $each: toAdd } } },
      { new: true }
    ).populate('owner').populate('members');

    if (!updated) return res.status(404).json({ message: 'Team not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/teams/:id/members/:userId - remove a member
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    // Only owner can remove members
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.owner?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    if (team.owner?.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the owner from members' });
    }

    const updated = await Team.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.params.userId } },
      { new: true }
    ).populate('owner').populate('members');

    if (!updated) return res.status(404).json({ message: 'Team not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/teams/:id - delete a team
router.delete('/:id', async (req, res) => {
  try {
    const current = await Team.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Team not found' });
    if (current.owner?.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    const deleted = await Team.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Team not found' });
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
