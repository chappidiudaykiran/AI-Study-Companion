const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    type: { type: String, required: true, index: true },
    payload: { type: Object, default: {} },
  },
  { timestamps: { createdAt: 'at', updatedAt: false } }
);

module.exports = mongoose.model('Event', eventSchema);
