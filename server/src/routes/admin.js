const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const AiLog = require('../models/AiLog');
const Job = require('../models/Job');

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

// ?user=&type=&limit=
router.get('/activity', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.user) q.user = req.query.user;
    if (req.query.type) q.type = req.query.type;
    if (req.query.project) q.project = req.query.project;
    const events = await Event.find(q).sort({ at: -1 }).limit(Number(req.query.limit) || 100).lean();
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

module.exports = router;
