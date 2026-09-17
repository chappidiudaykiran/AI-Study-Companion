const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    status: { type: String, enum: ['queued', 'processing', 'done', 'failed'], default: 'queued', index: true },
    retries: { type: Number, default: 0 },
    idempotencyKey: { type: String, required: true, unique: true },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
