const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const router = express.Router();

// POST /api/admin/seed-demo - runs the seedDemo script
router.post('/seed-demo', async (req, res) => {
  // Kick off the seeding as a child process so the API remains responsive
  const scriptPath = path.join(__dirname, '..', 'scripts', 'seedDemo.js');

  try {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: 'ignore', // detach from this request
      detached: true,
    });
    child.unref();
  } catch (err) {
    return res.status(500).json({ message: 'Failed to start seed process', error: String(err) });
  }

  return res.status(202).json({ message: 'Seed process started' });
});

module.exports = router;
