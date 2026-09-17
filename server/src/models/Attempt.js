const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userAnswer: { type: String, default: '' },
    score: { type: Number, default: 0 },
    feedback: {
      covered: { type: [String], default: [] },
      missing: { type: [String], default: [] },
      text: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attempt', attemptSchema);
