const mongoose = require('mongoose');

const conceptSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // Source material this concept was extracted from (for per-document grouping).
    // Legacy concepts predate this field and group under "Other".
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    docName: { type: String, default: '' },
  },
  { timestamps: true }
);
conceptSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Concept', conceptSchema);
