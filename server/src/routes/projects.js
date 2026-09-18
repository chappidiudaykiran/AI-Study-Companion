const express = require('express');
const { z } = require('zod');
const Project = require('../models/Project');
const Space = require('../models/Space');
const { auth } = require('../middleware/auth');
const { loadProject } = require('../middleware/ownership');
const { logEvent } = require('../services/eventService');
const { deleteProjectCascade } = require('../services/cleanup');

const router = express.Router();
router.use(auth);

const createSchema = z.object({
  spaceId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().default(''),
  goal: z.string().min(5).max(500),
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const space = await Space.findOne({ _id: data.spaceId, user: req.user._id });
    if (!space) return res.status(404).json({ error: 'Space not found' });
    const project = await Project.create({ space: space._id, user: req.user._id, name: data.name, description: data.description, goal: data.goal });
    await logEvent({ user: req.user._id, space: space._id, project: project._id, type: 'project.created', payload: { name: project.name } });
    res.status(201).json({ project });
  } catch (e) { next(e); }
});

router.get('/:projectId', loadProject, async (req, res, next) => {
  try {
    const project = await Project.findById(req.project._id).populate('space', 'name').lean();
    res.json({ project });
  } catch (e) { next(e); }
});

// DELETE /api/projects/:projectId — cascade deletes all project learning data
router.delete('/:projectId', loadProject, async (req, res, next) => {
  try {
    await deleteProjectCascade(req.project._id);
    await logEvent({ user: req.user._id, space: req.project.space, type: 'project.deleted', payload: { name: req.project.name } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
