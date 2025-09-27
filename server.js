require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const usersRouter = require('./routes/users');
const appointmentsRouter = require('./routes/appointments');
const teamsRouter = require('./routes/teams');
const followupsRouter = require('./routes/followups');
const auth = require('./middleware/auth');
const adminRouter = require('./routes/admin');
const authPublicRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Public auth routes (no auth middleware)
app.use('/auth', authPublicRouter);

// Auth for all API routes
app.use('/api', auth);

// Routes
app.use('/api/users', usersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/followups', followupsRouter);
app.use('/api/appointments/:appointmentId/followups', followupsRouter);
app.use('/api/admin', adminRouter);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the Node.js with MongoDB API');
});

// Start helper (for production/dev). Tests can import app without starting a server.
async function start () {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Start automatically only when run directly (not when required by tests)
if (require.main === module && process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = { app, start };
