const mongoose = require('mongoose');
const { Schema } = mongoose;

const teamSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// A user cannot have two teams with the same name
teamSchema.index({ owner: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
