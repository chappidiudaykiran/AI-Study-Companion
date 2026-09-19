const Mastery = require('../models/Mastery');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const LearningContext = require('../models/LearningContext');

// Builds the relevant-only context slice for the current task (§11):
// weakest concepts, strengths, recent accuracy, repeated mistakes.
async function getLearningContext(projectId, userId) {
  const [mastery, recent] = await Promise.all([
    Mastery.find({ project: projectId, user: userId }).sort({ score: 1 }).lean(),
    Attempt.find({ project: projectId, user: userId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  // Attempt carries no concept field — resolve via parent Question.
  let conceptByQ = {};
  try {
    const qIds = [...new Set(recent.map((a) => String(a.question)).filter(Boolean))];
    if (qIds.length) {
      const qDocs = await Question.find({ _id: { $in: qIds } }).select('_id concept').lean();
      conceptByQ = Object.fromEntries(qDocs.map((q) => [String(q._id), q.concept || 'General']));
    }
  } catch {}
  const withConcepts = recent.map((a) => ({ ...a, concept: conceptByQ[String(a.question)] || 'General' }));

  const weaknesses = mastery.filter((m) => m.score < 70).slice(0, 3).map((m) => `${m.concept} (${m.score}%)`);
  const strengths = mastery.filter((m) => m.score >= 75).slice(-2).map((m) => `${m.concept} (${m.score}%)`);
  const mistakeConcepts = withConcepts.filter((a) => (a.score || 0) < 60);
  const recentAccuracy = withConcepts.length
    ? Math.round(withConcepts.reduce((s, a) => s + (a.score || 0), 0) / withConcepts.length)
    : null;

  return { weaknesses, strengths, mistakeConcepts, recentAccuracy, attempts: withConcepts.length };
}

function contextBlock(ctx) {
  const lines = [];
  if (ctx.weaknesses.length) lines.push(`Known weaknesses: ${ctx.weaknesses.join(', ')}`);
  if (ctx.strengths.length) lines.push(`Known strengths: ${ctx.strengths.join(', ')}`);
  if (ctx.recentAccuracy !== null) lines.push(`Recent quiz accuracy: ${ctx.recentAccuracy}% over last ${ctx.attempts} answers`);
  if (ctx.mistakeConcepts.length) {
    const names = [...new Set(ctx.mistakeConcepts.map((a) => a.concept))].join(', ');
    lines.push(`Recent mistakes in: ${names} — offer extra care here`);
  }
  return lines.length ? lines.join('\n') : 'No assessment history yet.';
}

// Refreshes the persisted summary after new evidence (fire-and-forget safe).
async function updateAfterAttempt(projectId, userId) {
  try {
    const ctx = await getLearningContext(projectId, userId);
    const repeatedMistakes = [];
    const mastery = await Mastery.find({ project: projectId, user: userId }).lean();
    for (const m of mastery) {
      if ((m.mistakes || 0) >= 2) repeatedMistakes.push({ concept: m.concept, count: m.mistakes });
    }
    await LearningContext.updateOne(
      { project: projectId, user: userId },
      {
        $set: {
          weaknesses: ctx.weaknesses.map((w) => w.split(' (')[0]),
          strengths: ctx.strengths.map((s) => s.split(' (')[0]),
          repeatedMistakes,
          recentAccuracy: ctx.recentAccuracy,
          summary: ctx.weaknesses.length
            ? `Needs work: ${ctx.weaknesses.join('; ')}.`
            : 'No weak concepts identified yet.',
        },
      },
      { upsert: true }
    );
  } catch (e) {
    console.error('context update failed:', e.message);
  }
}

module.exports = { getLearningContext, contextBlock, updateAfterAttempt };
