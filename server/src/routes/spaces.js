const express = require('express');
const { z } = require('zod');
const Space = require('../models/Space');
const Project = require('../models/Project');
const Mastery = require('../models/Mastery');
const Attempt = require('../models/Attempt');
const { auth } = require('../middleware/auth');
const { loadSpace } = require('../middleware/ownership');
const { logEvent } = require('../services/eventService');
const { deleteProjectCascade } = require('../services/cleanup');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const spaces = await Space.find({ user: req.user._id }).sort({ updatedAt: -1 }).lean();
    const withCounts = await Promise.all(
      spaces.map(async (s) => ({ ...s, projects: await Project.countDocuments({ space: s._id, user: req.user._id }) }))
    );
    res.json({ spaces: withCounts });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = z.object({ name: z.string().min(2).max(80), description: z.string().max(500).optional().default('') }).parse(req.body);
    const space = await Space.create({ user: req.user._id, ...data });
    await logEvent({ user: req.user._id, space: space._id, type: 'space.created', payload: { name: space.name } });
    res.status(201).json({ space });
  } catch (e) { next(e); }
});

router.get('/:spaceId', loadSpace, async (req, res, next) => {
  try {
    const projects = await Project.find({ space: req.space._id, user: req.user._id }).sort({ updatedAt: -1 }).lean();
    // per-project progress snapshot: mastery avg, attempts, weakest concept (§4 space dashboard)
    const withStats = await Promise.all(
      projects.map(async (p) => {
        const [m, a] = await Promise.all([
          Mastery.find({ project: p._id, user: req.user._id }).lean(),
          Attempt.countDocuments({ project: p._id, user: req.user._id }),
        ]);
        const avg = m.length ? Math.round(m.reduce((s, x) => s + x.score, 0) / m.length) : null;
        const weakest = m.length ? m.slice().sort((x, y) => x.score - y.score)[0] : null;
        return {
          ...p,
          masteryAvg: avg,
          attempts: a,
          weakest: weakest ? { concept: weakest.concept, score: weakest.score } : null,
        };
      })
    );
    res.json({ space: req.space, projects: withStats });
  } catch (e) { next(e); }
});

// DELETE /api/spaces/:spaceId — cascade deletes projects + all learning data
router.delete('/:spaceId', loadSpace, async (req, res, next) => {
  try {
    const projects = await Project.find({ space: req.space._id, user: req.user._id }).select('_id').lean();
    for (const p of projects) await deleteProjectCascade(p._id);
    await Space.deleteOne({ _id: req.space._id });
    await logEvent({ user: req.user._id, type: 'space.deleted', payload: { name: req.space.name } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
