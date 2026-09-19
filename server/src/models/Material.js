const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    filePath: { type: String, required: true },
    pages: { type: Number, default: 0 },
    status: { type: String, enum: ['queued', 'processing', 'ready', 'failed'], default: 'queued', index: true },
    error: { type: String, default: '' },
    // live processing progress (shown as % + stage + elapsed time in Materials)
    progress: { type: Number, default: 0 },
    stage: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
