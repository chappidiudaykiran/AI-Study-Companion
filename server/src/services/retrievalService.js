const Chunk = require('../models/Chunk');
const Material = require('../models/Material');
const { embed, cosine } = require('./aiClient');

async function retrieveEvidence({ projectId, question, topK = 4, user = null, project = null }) {
  const chunks = await Chunk.find({ project: projectId }).select('text embedding page material').lean().limit(500);
  if (!chunks.length) return { hits: [], maxScore: 0, method: 'none' };

  let qVec = null;
  try {
    const vecs = await embed([question], { user, project });
    qVec = vecs[0];
  } catch (e) {
    qVec = null;
  }

  let scored = [];
  if (qVec && qVec.length) {
    scored = chunks.map((c) => ({ chunk: c, score: cosine(qVec, c.embedding || []) }));
  } else {
    // keyword fallback
    const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    scored = chunks.map((c) => {
      const t = (c.text || '').toLowerCase();
      let s = 0;
      for (const w of words) if (t.includes(w)) s += 1;
      return { chunk: c, score: s / Math.max(1, words.length) };
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK).filter((s) => s.score > 0);
  const maxScore = top.length ? top[0].score : 0;

  // attach doc names
  const matIds = [...new Set(top.map((t) => String(t.chunk.material)))];
  const mats = await Material.find({ _id: { $in: matIds } }).select('filename').lean();
  const nameById = Object.fromEntries(mats.map((m) => [String(m._id), m.filename]));

  const hits = top.map((t) => ({
    chunkId: String(t.chunk._id),
    text: t.chunk.text,
    page: t.chunk.page,
    doc: nameById[String(t.chunk.material)] || 'Material',
    score: t.score,
  }));

  return { hits, maxScore, method: qVec ? 'vector' : 'keyword' };
}

module.exports = { retrieveEvidence };
