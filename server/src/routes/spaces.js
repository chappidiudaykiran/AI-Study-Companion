const express = require('express');
const { z } = require('zod');
const Space = require('../models/Space');
const Project = require('../models/Project');
const { auth } = require('../middleware/auth');
const { loadSpace } = require('../middleware/ownership');
const { logEvent } = require('../services/eventService');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const spaces = await Space.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ spaces });
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
    const projects = await Project.find({ space: req.space._id, user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ space: req.space, projects });
  } catch (e) { next(e); }
});

module.exports = router;
