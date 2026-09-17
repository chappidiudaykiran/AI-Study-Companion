const mongoose = require('mongoose');

// Persistent, relevant learner context per project (§11).
// Stores distilled signals — not raw history. Rebuilt from Mastery/Attempts.
const learningContextSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    repeatedMistakes: {
      type: [{ concept: String, count: Number }],
      default: [],
    },
    recentAccuracy: { type: Number, default: null },
    summary: { type: String, default: '' },
  },
  { timestamps: true }
);
learningContextSchema.index({ project: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('LearningContext', learningContextSchema);
