const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Space = require('../models/Space');
const Project = require('../models/Project');
const Material = require('../models/Material');
const Recommendation = require('../models/Recommendation');
const Chunk = require('../models/Chunk');
const Mastery = require('../models/Mastery');
const Attempt = require('../models/Attempt');
const Event = require('../models/Event');
const AiLog = require('../models/AiLog');
const Job = require('../models/Job');
const { computeEvaluation } = require('../services/evalService');

const router = express.Router();
router.use(auth, requireAdmin);

router.get('/overview', async (req, res, next) => {
  try {
    const day7 = new Date(Date.now() - 7 * 864e5);
    const day24h = new Date(Date.now() - 864e5);
    const [
      users, spaces, projects, documents, quizzes, recommendations, evidenceRows,
      events, aiErrors, jobsFailed,
      quizAttempts7d, spend7d, failedJobs24h, failedLlm24h,
    ] = await Promise.all([
      User.countDocuments(),
      Space.countDocuments(),
      Project.countDocuments(),
      Material.countDocuments(),
      Attempt.countDocuments(),
      Recommendation.countDocuments(),
      Chunk.countDocuments(),
      Event.countDocuments(),
      AiLog.countDocuments({ status: 'error' }),
      Job.countDocuments({ status: 'failed' }),
      Attempt.countDocuments({ createdAt: { $gte: day7 } }),
      AiLog.aggregate([
        { $match: { createdAt: { $gte: day7 } } },
        { $group: { _id: null, spend: { $sum: '$cost_est' } } },
      ]),
      Job.countDocuments({ status: 'failed', updatedAt: { $gte: day24h } }),
      AiLog.countDocuments({ status: 'error', createdAt: { $gte: day24h } }),
    ]);
    res.json({
      users, spaces, projects, documents, quizzes, recommendations, evidenceRows,
      events, aiErrors, jobsFailed, quizAttempts7d,
      aiSpend7d: spend7d[0]?.spend || 0,
      failures24h: failedJobs24h + failedLlm24h,
      failedJobs24h, failedLlm24h,
    });
  } catch (e) { next(e); }
});

// AI usage aggregates with feature/provider filters (powers the AI Usage tab:
// tiles, latency p50/p95, cost-per-day series, filter dropdown options)
router.get('/ai-usage', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.feature) q.feature = req.query.feature;
    if (req.query.provider) {
      q.$or = [{ provider: req.query.provider }, { model: new RegExp(req.query.provider, 'i') }];
    }
    const [features, providers] = await Promise.all([
      AiLog.distinct('feature'),
      AiLog.distinct('provider'),
    ]);
    const logs = await AiLog.find(q).sort({ createdAt: -1 }).limit(2000).lean();
    const calls = logs.length;
    const tokens = logs.reduce((s, l) => s + (l.tokens || 0), 0);
    const cost = logs.reduce((s, l) => s + (l.cost_est || 0), 0);
    const errors = logs.filter((l) => l.status === 'error').length;
    const lats = logs.map((l) => l.latency_ms || 0).filter((x) => x > 0).sort((a, b) => a - b);
    const pct = (p) => (lats.length ? lats[Math.min(lats.length - 1, Math.floor((p / 100) * lats.length))] : 0);
    const byDay = {};
    logs.forEach((l) => {
      const d = new Date(l.createdAt).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] || 0) + (l.cost_est || 0);
    });
    const costPerDay = Object.entries(byDay).sort().slice(-14)
      .map(([day, c]) => ({ day: day.slice(5), cost: +c.toFixed(6) }));
    res.json({
      calls, tokens, cost, errorRate: calls ? errors / calls : 0,
      p50: pct(50), p95: pct(95),
      costPerDay, features: features.filter(Boolean).sort(), providers: providers.filter(Boolean).sort(),
    });
  } catch (e) { next(e); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(100).lean();
    const [projCounts, lastSeen] = await Promise.all([
      Project.aggregate([{ $group: { _id: '$user', n: { $sum: 1 } } }]),
      Event.aggregate([{ $group: { _id: '$user', at: { $max: '$at' } } }]),
    ]);
    const pc = Object.fromEntries(projCounts.map((p) => [String(p._id), p.n]));
    const ls = Object.fromEntries(lastSeen.map((l) => [String(l._id), l.at]));
    res.json({ users: users.map((u) => ({ ...u, projects: pc[u._id] ?? 0, lastActive: ls[u._id] || null })) });
  } catch (e) { next(e); }
});

// ?user=&type=&project=&space=&from=&to=&limit= (ISO dates for from/to)
router.get('/activity', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.user) q.user = req.query.user;
    if (req.query.type) q.type = req.query.type;
    if (req.query.project) q.project = req.query.project;
    if (req.query.space) q.space = req.query.space;
    if (req.query.from || req.query.to) {
      q.at = {};
      if (req.query.from) q.at.$gte = new Date(req.query.from);
      if (req.query.to) q.at.$lte = new Date(req.query.to);
    }
    const events = await Event.find(q).sort({ at: -1 }).limit(Math.min(Number(req.query.limit) || 100, 500)).lean();
    res.json({ events });
  } catch (e) { next(e); }
});

router.get('/ailogs', async (req, res, next) => {
  try {
    const logs = await AiLog.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ logs });
  } catch (e) { next(e); }
});

router.get('/jobs', async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ jobs });
  } catch (e) { next(e); }
});

router.post('/jobs/:id/retry', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    job.status = 'queued';
    job.error = '';
    job.retries = 0;
    await job.save();
    res.json({ job });
  } catch (e) { next(e); }
});

// Platform spaces + projects (§16 admin visibility)
router.get('/spaces', async (req, res, next) => {
  try {
    const spaces = await Space.find().sort({ createdAt: -1 }).limit(100).populate('user', 'email').lean();
    const withCounts = await Promise.all(
      spaces.map(async (s) => ({
        ...s,
        projects: await Project.countDocuments({ space: s._id }),
      }))
    );
    res.json({ spaces: withCounts });
  } catch (e) { next(e); }
});

router.get('/projects', async (req, res, next) => {
  try {
    const projects = await Project.find()
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate('user', 'email')
      .populate('space', 'name')
      .lean();
    res.json({ projects });
  } catch (e) { next(e); }
});

// User learning journey drill-down: projects, assessments, progress, AI usage (§16)
router.get('/users/:id/journey', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [spaces, projects, attempts, mastery, events, aiStats] = await Promise.all([
      Space.find({ user: user._id }).lean(),
      Project.find({ user: user._id }).sort({ updatedAt: -1 }).lean(),
      Attempt.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
      Mastery.find({ user: user._id }).sort({ score: 1 }).lean(),
      Event.find({ user: user._id }).sort({ at: -1 }).limit(30).lean(),
      AiLog.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: '$feature', calls: { $sum: 1 }, errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } }, avgLatency: { $avg: '$latency_ms' } } },
      ]),
    ]);
    const allAttempts = await Attempt.find({ user: user._id }).select('score').lean();
    const avgScore = allAttempts.length
      ? Math.round(allAttempts.reduce((s, a) => s + (a.score || 0), 0) / allAttempts.length)
      : 0;
    res.json({ user, spaces, projects, attempts, avgScore, mastery, events, aiUsage: aiStats });
  } catch (e) { next(e); }
});

// Live AI evaluation computed from production data (§14)
router.get('/evaluation', async (req, res, next) => {
  try {
    res.json(await computeEvaluation());
  } catch (e) { next(e); }
});

module.exports = router;
