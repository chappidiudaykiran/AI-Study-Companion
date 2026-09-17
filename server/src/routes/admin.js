const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Space = require('../models/Space');
const Project = require('../models/Project');
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
    const [users, events, aiErrors, jobsFailed] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      AiLog.countDocuments({ status: 'error' }),
      Job.countDocuments({ status: 'failed' }),
    ]);
    res.json({ users, events, aiErrors, jobsFailed });
  } catch (e) { next(e); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(100).lean();
    res.json({ users });
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
