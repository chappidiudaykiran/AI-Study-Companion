const mongoose = require('mongoose');

const flashcardReviewSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    flashcard: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    known: { type: Boolean, default: false },
    timesSeen: { type: Number, default: 0 },
    timesKnown: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
flashcardReviewSchema.index({ flashcard: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('FlashcardReview', flashcardReviewSchema);
