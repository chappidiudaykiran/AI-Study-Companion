const mongoose = require('mongoose');

const masterySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    concept: { type: String, required: true },
    score: { type: Number, default: 50 },
    history: { type: [{ score: Number, at: Date }], default: [] },
    mistakes: { type: Number, default: 0 },
  },
  { timestamps: true }
);
masterySchema.index({ project: 1, user: 1, concept: 1 }, { unique: true });

module.exports = mongoose.model('Mastery', masterySchema);
