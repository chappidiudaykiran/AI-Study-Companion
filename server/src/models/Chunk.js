const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    page: { type: Number, default: 1 },
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);
chunkSchema.index({ project: 1, material: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
