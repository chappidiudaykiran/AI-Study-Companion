const Message = require('../models/Message');
const AiLog = require('../models/AiLog');
const Attempt = require('../models/Attempt');

// Rule-based evaluation computed from real production data (§14):
// tutor groundedness, unsupported handling, latency, structured reliability.
async function computeEvaluation() {
  const [assistantMsgs, logs, attempts] = await Promise.all([
    Message.find({ role: 'assistant' }).sort({ createdAt: -1 }).limit(100).lean(),
    AiLog.find().sort({ createdAt: -1 }).limit(200).lean(),
    Attempt.countDocuments(),
  ]);

  const cited = assistantMsgs.filter((m) => (m.citations || []).length > 0).length;
  const refusals = assistantMsgs.filter(
    (m) => (m.citations || []).length === 0 && /insufficient evidence/i.test(m.text || '')
  ).length;

  const byFeature = {};
  for (const l of logs) {
    const f = (byFeature[l.feature] ||= { count: 0, errors: 0, latencyTotal: 0, models: {} });
    f.count += 1;
    if (l.status === 'error') f.errors += 1;
    f.latencyTotal += l.latency_ms || 0;
    if (l.model) f.models[l.model] = (f.models[l.model] || 0) + 1;
  }
  const latency = {};
  for (const [k, v] of Object.entries(byFeature)) {
    latency[k] = {
      count: v.count,
      avgLatencyMs: v.count ? Math.round(v.latencyTotal / v.count) : 0,
      errorRate: v.count ? +(v.errors / v.count).toFixed(3) : 0,
      models: v.models,
    };
  }
  const totalErrors = logs.filter((l) => l.status === 'error').length;

  return {
    generatedAt: new Date().toISOString(),
    tutor: {
      sampledAnswers: assistantMsgs.length,
      citationRate: assistantMsgs.length ? +(cited / assistantMsgs.length).toFixed(3) : null,
      unsupportedRefusals: refusals,
    },
    reliability: {
      aiCalls: logs.length,
      errorRate: logs.length ? +(totalErrors / logs.length).toFixed(3) : 0,
      gradedAnswers: attempts,
    },
    latency,
    notes: [
      'citationRate = assistant answers carrying doc+page citations (target > 0.7 once materials exist)',
      'unsupportedRefusals = "insufficient evidence" responses (must be > 0 when tested with off-topic questions)',
      'errorRate per feature doubles as structured-output reliability signal',
    ],
  };
}

module.exports = { computeEvaluation };
