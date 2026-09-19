const express = require('express');
const { auth } = require('../middleware/auth');
const { loadProject } = require('../middleware/ownership');
const Mastery = require('../models/Mastery');
const Attempt = require('../models/Attempt');
const Event = require('../models/Event');
const Project = require('../models/Project');
const Space = require('../models/Space');
const Material = require('../models/Material');
const Message = require('../models/Message');
const Recommendation = require('../models/Recommendation');
const Concept = require('../models/Concept');
const { buildRecommendation, growthBuckets, buildAdaptive } = require('../services/recommendService');

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

// GET /api/projects/:projectId/concepts — concepts divided by source material,
// each merged with the learner's mastery (score/mistakes/status).
router.get('/projects/:projectId/concepts', loadProject, async (req, res, next) => {
  try {
    const [concepts, mastery] = await Promise.all([
      Concept.find({ project: req.project._id }).sort({ createdAt: 1 }).lean(),
      Mastery.find({ project: req.project._id, user: req.user._id }).lean(),
    ]);
    const byName = Object.fromEntries(mastery.map((m) => [m.concept, m]));
    const growth = Object.fromEntries(growthBuckets(mastery).map((g) => [g.concept, g]));
    const list = concepts.map((c) => {
      const m = byName[c.name];
      const g = growth[c.name];
      return {
        name: c.name,
        description: c.description || '',
        docName: c.docName || '',
        material: c.material || null,
        score: m?.score ?? null,
        mistakes: m?.mistakes ?? 0,
        status: g?.status || 'unattempted',
        delta: g?.delta ?? 0,
      };
    });
    // concepts with mastery but no Concept row (e.g. from flashcards) still show
    for (const m of mastery) {
      if (!list.some((c) => c.name === m.concept)) {
        const g = growth[m.concept];
        list.push({ name: m.concept, description: '', docName: '', material: null, score: m.score, mistakes: m.mistakes || 0, status: g?.status || 'stable', delta: g?.delta ?? 0 });
      }
    }
    res.json({ concepts: list });
  } catch (e) { next(e); }
});

// GET /api/projects/:projectId/adaptive — one payload for EVERY tab banner
// (overview, materials, tutor, concepts, quiz, flashcards, assignments, analytics)
router.get('/projects/:projectId/adaptive', loadProject, async (req, res, next) => {
  try {
    const adaptive = await buildAdaptive({ projectId: req.project._id, userId: req.user._id, project: req.project });
    res.json({ adaptive });
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

// GET /api/analytics/global — answers "where was I, how am I doing, what next?" (§16)
router.get('/analytics/global', async (req, res, next) => {
  try {
    const [attempts, events, projects] = await Promise.all([
      Attempt.find({ user: req.user._id }).lean(),
      Event.find({ user: req.user._id }).sort({ at: -1 }).limit(100).lean(),
      Project.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(5).populate('space', 'name').lean(),
    ]);
    const [spaces, materials, tutorAnswers, masteryAll, recs] = await Promise.all([
      Space.countDocuments({ user: req.user._id }),
      Material.countDocuments({ user: req.user._id }),
      Message.countDocuments({ user: req.user._id, role: 'assistant' }),
      Mastery.find({ user: req.user._id }).select('score').lean(),
      Recommendation.countDocuments({ user: req.user._id }),
    ]);
    const masteryAvg = masteryAll.length ? Math.round(masteryAll.reduce((s, m) => s + m.score, 0) / masteryAll.length) : 0;
    const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length) : 0;
    const byType = {};
    events.forEach((e) => { byType[e.type] = (byType[e.type] || 0) + 1; });
    // areas requiring attention: weakest concepts across all projects
    const weak = await Mastery.find({ user: req.user._id, score: { $lt: 60 } })
      .sort({ score: 1 })
      .limit(5)
      .populate('project', 'name')
      .lean();
    const nextRec = await Recommendation.findOne({ user: req.user._id, status: 'active' })
      .sort({ createdAt: -1 })
      .populate('project', 'name')
      .lean();
    res.json({
      attempts: attempts.length,
      avgScore: avg,
      byType,
      recentEvents: events.slice(0, 20),
      spaces,
      projectsCount: await Project.countDocuments({ user: req.user._id }),
      materials: materials,
      tutorAnswers,
      quizCount: byType['quiz.started'] || 0,
      masteryAvg,
      recs,
      recentProjects: projects.map((p) => ({ id: p._id, name: p.name, goal: p.goal, space: p.space?.name || '' })),
      attention: weak.map((w) => ({ concept: w.concept, score: w.score, mistakes: w.mistakes, project: w.project?.name || '', projectId: w.project?._id || null })),
      nextAction: nextRec ? { text: nextRec.text, project: nextRec.project?.name || '', projectId: nextRec.project?._id || null } : null,
    });
  } catch (e) { next(e); }
});

module.exports = router;
