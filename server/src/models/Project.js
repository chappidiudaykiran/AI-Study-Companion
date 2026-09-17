const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    goal: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
