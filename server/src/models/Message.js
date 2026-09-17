const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    citations: { type: [{ doc: String, page: Number, chunkId: String }], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
