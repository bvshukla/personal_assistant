const mongoose = require('mongoose');

const { Schema } = mongoose;

const appointmentSchema = new mongoose.Schema({
  // Foreign key to User
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  startAt: {
    type: Date,
    required: true
  },
  endAt: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validation: endAt must be after startAt
appointmentSchema.path('endAt').validate(function (value) {
  if (!this.startAt || !value) return true;
  return value > this.startAt;
}, 'End time must be after start time');

// Optional validations for future times and business hours
function parseTimeHHMM(str) {
  const [h, m] = (str || '').split(':').map(Number);
  if (Number.isInteger(h) && Number.isInteger(m)) return { h, m };
  return null;
}

appointmentSchema.pre('validate', function(next) {
  try {
    const now = new Date();
    const enforceFuture = process.env.APPOINTMENT_REQUIRE_FUTURE === 'true';
    if (enforceFuture) {
      if (this.startAt && this.startAt < now) return next(new Error('startAt must be in the future'));
      if (this.endAt && this.endAt < now) return next(new Error('endAt must be in the future'));
    }

    const startCfg = parseTimeHHMM(process.env.BUSINESS_HOURS_START);
    const endCfg = parseTimeHHMM(process.env.BUSINESS_HOURS_END);
    if (startCfg && endCfg) {
      const withinHours = (d) => {
        if (!d) return true;
        const local = new Date(d);
        const minutes = local.getHours() * 60 + local.getMinutes();
        const startMin = startCfg.h * 60 + startCfg.m;
        const endMin = endCfg.h * 60 + endCfg.m;
        return minutes >= startMin && minutes <= endMin;
      };
      if (this.startAt && !withinHours(this.startAt)) return next(new Error('startAt is outside business hours'));
      if (this.endAt && !withinHours(this.endAt)) return next(new Error('endAt is outside business hours'));
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Cascade delete follow-ups when an appointment is deleted
appointmentSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return;
  try {
    const FollowUpItem = require('./FollowUpItem');
    await FollowUpItem.deleteMany({ appointment: doc._id });
  } catch (err) {
    // log and continue; avoid throwing inside middleware
    console.error('Error cascading delete of follow-ups:', err);
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
