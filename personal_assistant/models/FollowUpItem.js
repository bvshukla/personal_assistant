const mongoose = require('mongoose');
const { Schema } = mongoose;

const followUpItemSchema = new Schema({
  appointment: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  assignee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  dueAt: {
    type: Date
  },
  completed: {
    type: Boolean,
    default: false,
    index: true
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure defaults and validate relative to appointment
followUpItemSchema.pre('validate', async function (next) {
  try {
    if (!this.appointment) return next();
    const Appointment = require('./Appointment');
    const appt = await Appointment.findById(this.appointment).select('user startAt endAt');
    if (!appt) return next();

    // Default assignee to appointment owner if not provided
    if (!this.assignee) {
      this.assignee = appt.user;
    }

    // Validate dueAt to be after appointment end (if both set)
    if (this.dueAt && appt.endAt && this.dueAt < appt.endAt) {
      return next(new Error('dueAt must be on or after the appointment end time'));
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Simple helper: set completedAt when completed flips to true
followUpItemSchema.pre('save', function (next) {
  if (this.isModified('completed')) {
    this.completedAt = this.completed ? (this.completedAt || new Date()) : null;
  }
  next();
});

// Prevent duplicate follow-up titles within the same appointment
followUpItemSchema.index({ appointment: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('FollowUpItem', followUpItemSchema);
