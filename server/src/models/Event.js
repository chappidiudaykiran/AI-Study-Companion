const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    type: { type: String, required: true, index: true },
    payload: { type: Object, default: {} },
    // optional idempotency key — duplicate events with the same key are skipped
    key: { type: String, index: true, sparse: true },
  },
  { timestamps: { createdAt: 'at', updatedAt: false } }
);

eventSchema.index({ key: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Event', eventSchema);
