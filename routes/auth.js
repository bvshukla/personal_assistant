const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });
    return res.status(201).json({ userId: user._id.toString(), name: user.name, email: user.email });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.password);
    } catch (_) {
      ok = false;
    }
    // Fallback for legacy plaintext passwords created before bcrypt was added
    if (!ok && user.password === password) {
      ok = true;
    }
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    return res.json({ userId: user._id.toString(), name: user.name, email: user.email });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
