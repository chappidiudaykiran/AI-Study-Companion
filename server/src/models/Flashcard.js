const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    concept: { type: String, default: 'General' },
    front: { type: String, required: true },
    back: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { timestamps: true }
);
flashcardSchema.index({ project: 1, front: 1 }, { unique: true });

module.exports = mongoose.model('Flashcard', flashcardSchema);
