const express = require('express');
const { auth } = require('../middleware/auth');
const { loadProject } = require('../middleware/ownership');
const Mastery = require('../models/Mastery');
const Attempt = require('../models/Attempt');
const Event = require('../models/Event');
const Recommendation = require('../models/Recommendation');
const { buildRecommendation, growthBuckets } = require('../services/recommendService');

const router = express.Router();
router.use(auth);

// GET /api/projects/:projectId/growth
router.get('/projects/:projectId/growth', loadProject, async (req, res, next) => {
  try {
    const mastery = await Mastery.find({ project: req.project._id, user: req.user._id }).lean();
    res.json({ growth: growthBuckets(mastery) });
  } catch (e) { next(e); }
});

// GET /api/projects/:projectId/recommendations (builds fresh one)
router.get('/projects/:projectId/recommendations', loadProject, async (req, res, next) => {
  try {
    const rec = await buildRecommendation({ projectId: req.project._id, userId: req.user._id, project: req.project });
    const all = await Recommendation.find({ project: req.project._id, user: req.user._id }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ current: rec, history: all });
  } catch (e) { next(e); }
});

// GET /api/projects/:projectId/analytics
router.get('/projects/:projectId/analytics', loadProject, async (req, res, next) => {
  try {
    const [attempts, events] = await Promise.all([
      Attempt.find({ project: req.project._id, user: req.user._id }).lean(),
      Event.find({ project: req.project._id, user: req.user._id }).sort({ at: -1 }).limit(50).lean(),
    ]);
    const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length) : 0;
    res.json({ attempts: attempts.length, avgScore: avg, events, recentAttempts: attempts.slice(-10) });
  } catch (e) { next(e); }
});

// GET /api/analytics/global
router.get('/analytics/global', async (req, res, next) => {
  try {
    const [attempts, events] = await Promise.all([
      Attempt.find({ user: req.user._id }).lean(),
      Event.find({ user: req.user._id }).sort({ at: -1 }).limit(100).lean(),
    ]);
    const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length) : 0;
    const byType = {};
    events.forEach((e) => { byType[e.type] = (byType[e.type] || 0) + 1; });
    res.json({ attempts: attempts.length, avgScore: avg, byType, recentEvents: events.slice(0, 20) });
  } catch (e) { next(e); }
});

module.exports = router;
