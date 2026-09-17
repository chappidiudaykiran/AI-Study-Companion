const mongoose = require('mongoose');

const recSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['active', 'done', 'dismissed'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recommendation', recSchema);
