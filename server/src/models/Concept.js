const mongoose = require('mongoose');

const conceptSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);
conceptSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Concept', conceptSchema);
