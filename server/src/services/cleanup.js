const fs = require('fs');
const Project = require('../models/Project');
const Material = require('../models/Material');
const Chunk = require('../models/Chunk');
const Concept = require('../models/Concept');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Mastery = require('../models/Mastery');
const Message = require('../models/Message');
const Recommendation = require('../models/Recommendation');
const LearningContext = require('../models/LearningContext');
const Event = require('../models/Event');
const AiLog = require('../models/AiLog');
const Job = require('../models/Job');
const Flashcard = require('../models/Flashcard');
const FlashcardReview = require('../models/FlashcardReview');

async function deleteMaterialCascade(materialId) {
  const mat = await Material.findById(materialId);
  if (!mat) return false;
  try {
    if (mat.filePath && fs.existsSync(mat.filePath)) fs.unlinkSync(mat.filePath);
  } catch {}
  // Remove this document's concepts immediately so deleted docs never show
  // concepts. A shared name still present in a remaining material is reassigned
  // to that material instead of being dropped.
  try {
    const tied = await Concept.find({ material: mat._id }).lean();
    if (tied.length) {
      const remaining = await Material.find({ project: mat.project, _id: { $ne: mat._id } }).select('_id filename').lean();
      const esc = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const c of tied) {
        let reassigned = false;
        if (remaining.length) {
          const hit = await Chunk.findOne({
            project: mat.project,
            material: { $in: remaining.map((r) => r._id) },
            text: { $regex: esc(c.name), $options: 'i' },
          }).select('material').lean();
          if (hit) {
            const rm = remaining.find((r) => String(r._id) === String(hit.material));
            await Concept.updateOne({ _id: c._id }, { $set: { material: hit.material, docName: rm?.filename || '' } });
            reassigned = true;
          }
        }
        if (!reassigned) await Concept.deleteOne({ _id: c._id });
      }
    }
  } catch (e) { console.error('concept cleanup failed:', e.message); }
  await Chunk.deleteMany({ material: mat._id });
  await Job.deleteMany({ refId: mat._id });
  await Material.deleteOne({ _id: mat._id });
  return true;
}

async function deleteProjectCascade(projectId) {
  const materials = await Material.find({ project: projectId }).select('_id filePath').lean();
  for (const m of materials) {
    try {
      if (m.filePath && fs.existsSync(m.filePath)) fs.unlinkSync(m.filePath);
    } catch {}
  }
  const matIds = materials.map((m) => m._id);
  await Chunk.deleteMany({ material: { $in: matIds } });
  await Material.deleteMany({ project: projectId });
  await Concept.deleteMany({ project: projectId });
  await Question.deleteMany({ project: projectId });
  await Attempt.deleteMany({ project: projectId });
  await Mastery.deleteMany({ project: projectId });
  await Message.deleteMany({ project: projectId });
  await Recommendation.deleteMany({ project: projectId });
  await LearningContext.deleteMany({ project: projectId });
  await Event.deleteMany({ project: projectId });
  await AiLog.deleteMany({ project: projectId });
  await Job.deleteMany({ project: projectId });
  await Flashcard.deleteMany({ project: projectId });
  await FlashcardReview.deleteMany({ project: projectId });
  await Project.deleteOne({ _id: projectId });
}

module.exports = { deleteMaterialCascade, deleteProjectCascade };
