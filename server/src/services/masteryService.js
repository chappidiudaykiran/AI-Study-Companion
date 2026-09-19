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

// Adaptive difficulty: weak concepts get easy scaffolds, strong get hard stretch.
function difficultyForScore(score) {
  if (score == null) return 'medium';
  if (score < 50) return 'easy';
  if (score >= 80) return 'hard';
  return 'medium';
}

function reasonForConcept(concept, state) {
  if (!state) return `New concept "${concept}" — no attempts yet, starting at medium.`;
  const parts = [];
  parts.push(`${state.score}% mastery`);
  if ((state.mistakes || 0) > 0) parts.push(`${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}`);
  const h = state.history || [];
  if (h.length > 1) {
    const delta = state.score - h[h.length - 2].score;
    if (delta <= -5) parts.push(`slipping ${delta}`);
    else if (delta >= 5) parts.push(`improving +${delta}`);
  }
  if (state.score < 60) return `Weak: "${concept}" (${parts.join(', ')}). Picked for repair.`;
  if (state.score >= 80) return `Strong: "${concept}" (${parts.join(', ')}). Picked for stretch.`;
  return `Review: "${concept}" (${parts.join(', ')}). Picked to consolidate.`;
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

// Small mastery nudge from flashcard self-reviews (spaced-repetition signal).
// known=true → +4 capped at 100, known=false → -4 floored at 0 + mistake.
async function updateMasteryForFlashcard({ projectId, userId, concept, known }) {
  let m = await Mastery.findOne({ project: projectId, user: userId, concept });
  if (!m) {
    m = await Mastery.create({
      project: projectId,
      user: userId,
      concept,
      score: known ? 54 : 46,
      mistakes: known ? 0 : 1,
      history: [{ score: known ? 54 : 46, at: new Date() }],
    });
    return m;
  }
  const next = known ? Math.min(100, m.score + 4) : Math.max(0, m.score - 4);
  m.score = next;
  m.history.push({ score: next, at: new Date() });
  if (m.history.length > 30) m.history = m.history.slice(-30);
  if (!known) m.mistakes += 1;
  await m.save();
  return m;
}

module.exports = { updateMastery, pickNextConcept, difficultyForScore, reasonForConcept, updateMasteryForFlashcard };
