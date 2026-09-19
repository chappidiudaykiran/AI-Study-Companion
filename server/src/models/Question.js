const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    concept: { type: String, default: 'General' },
    type: { type: String, enum: ['mcq', 'tf', 'short', 'open'], required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    stem: { type: String, required: true },
    options: { type: [String], default: [] },
    answerKey: { type: String, default: '' },
    // accepted synonyms for instant-graded short answers
    acceptedAnswers: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
