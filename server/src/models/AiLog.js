const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    feature: { type: String, required: true, index: true },
    provider: { type: String, default: '', index: true },
    model: { type: String, default: '' },
    latency_ms: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    cost_est: { type: Number, default: 0 },
    status: { type: String, enum: ['ok', 'error'], default: 'ok' },
    error: { type: String, default: '' },
    retrievalIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AiLog', aiLogSchema);
