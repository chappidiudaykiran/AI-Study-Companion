const Mastery = require('../models/Mastery');
const Attempt = require('../models/Attempt');

async function updateMastery({ projectId, userId, concept, score }) {
  let m = await Mastery.findOne({ project: projectId, user: userId, concept });
  if (!m) {
    m = await Mastery.create({ project: projectId, user: userId, concept, score, history: [{ score, at: new Date() }] });
    return m;
  }
  const next = Math.round(0.7 * m.score + 0.3 * score);
  m.score = next;
  m.history.push({ score: next, at: new Date() });
  if (m.history.length > 30) m.history = m.history.slice(-30);
  if (score < 60) m.mistakes += 1;
  await m.save();
  return m;
}

// Adaptive priority (NOT wrong->easy): low mastery + mistakes + recency
async function pickNextConcept({ projectId, userId, concepts }) {
  const states = await Mastery.find({ project: projectId, user: userId }).lean();
  const byConcept = Object.fromEntries(states.map((s) => [s.concept, s]));
  const attempts = await Attempt.find({ project: projectId, user: userId }).sort({ createdAt: -1 }).limit(20).lean();

  let best = concepts[0];
  let bestScore = -Infinity;
  for (const c of concepts) {
    const st = byConcept[c] || { score: 50, mistakes: 0 };
    const recentMistakes = attempts.filter((a) => (a.score || 0) < 60).length;
    const priority = 0.4 * (100 - st.score) + 0.3 * Math.min(10, st.mistakes || 0) * 10 + 0.2 * Math.min(10, recentMistakes) * 5 + 0.1 * 5;
    if (priority > bestScore) { bestScore = priority; best = c; }
  }
  return best;
}

module.exports = { updateMastery, pickNextConcept };
