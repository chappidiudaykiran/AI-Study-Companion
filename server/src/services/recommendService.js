const Mastery = require('../models/Mastery');
const Recommendation = require('../models/Recommendation');
const { generateStructured } = require('./aiClient');
const { logEvent } = require('./eventService');

async function buildRecommendation({ projectId, userId, project }) {
  const mastery = await Mastery.find({ project: projectId, user: userId }).sort({ score: 1 }).lean();
  if (!mastery.length) {
    return await Recommendation.create({
      project: projectId, user: userId,
      text: 'Upload material and take your first quiz to generate personalized next steps.',
      reason: 'no-data',
    });
  }
  const weakest = mastery.slice(0, 2);
  const weakStr = weakest.map((w) => `${w.concept} (${w.score}%, mistakes:${w.mistakes})`).join(', ');

  // avoid repeat: check last rec
  const last = await Recommendation.findOne({ project: projectId, user: userId }).sort({ createdAt: -1 }).lean();

  let text = `Focus on ${weakest[0].concept} (${weakest[0].score}%). Review related material and take a short 3-question quiz.`;
  try {
    const out = await generateStructured(
      `Learner goal: ${project.goal}\nWeak concepts: ${weakStr}\nGive 1 actionable next step (1-2 sentences). Schema: {"text":"...","reason":"..."}`,
      { user: userId, project: projectId, feature: 'recommend' }
    );
    if (out.text && out.text !== last?.text) text = out.text.slice(0, 400);
  } catch (e) { /* fallback kept */ }

  if (last && last.text === text) return last;
  const rec = await Recommendation.create({ project: projectId, user: userId, text, reason: `weak:${weakest.map((w) => w.concept).join(',')}` });
  await logEvent({ user: userId, project: projectId, type: 'recommendation.created', payload: { text: text.slice(0, 200) } });
  return rec;
}

function growthBuckets(masteryList) {
  return masteryList.map((m) => {
    const h = m.history || [];
    const prev = h.length > 1 ? h[h.length - 2].score : m.score;
    const delta = m.score - prev;
    const status = delta >= 5 ? 'improving' : delta <= -5 ? 'needs-attention' : 'stable';
    return { concept: m.concept, score: m.score, delta, status, history: h.slice(-10) };
  });
}

module.exports = { buildRecommendation, growthBuckets };
