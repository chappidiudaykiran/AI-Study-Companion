const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Material = require('../models/Material');
const Job = require('../models/Job');
const { auth } = require('../middleware/auth');
const { loadProject } = require('../middleware/ownership');
const { uploadLimiter } = require('../middleware/rateLimit');
const { logEvent } = require('../services/eventService');
const { deleteMaterialCascade } = require('../services/cleanup');

const router = express.Router();
router.use(auth);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF allowed'));
    cb(null, true);
  },
});

// POST /api/projects/:projectId/materials
router.post('/projects/:projectId/materials', uploadLimiter, loadProject, upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file required (field: pdf)' });
    const material = await Material.create({
      project: req.project._id,
      user: req.user._id,
      filename: req.file.originalname,
      filePath: req.file.path,
      status: 'queued',
    });
    await Job.create({
      type: 'doc-process',
      refId: material._id,
      user: req.user._id,
      project: req.project._id,
      status: 'queued',
      idempotencyKey: `doc-${material._id}`,
    });
    await logEvent({ user: req.user._id, project: req.project._id, type: 'material.uploaded', payload: { materialId: material._id, filename: material.filename } });
    // kick the worker now instead of waiting for the 10s poll so concepts appear fast
    try {
      const { runOnce } = require('../services/jobWorker');
      runOnce().catch(() => {});
    } catch {}
    res.status(201).json({ material });
  } catch (e) { next(e); }
});

// GET /api/materials/:materialId/status
router.get('/materials/:materialId/status', async (req, res, next) => {
  try {
    const material = await Material.findOne({ _id: req.params.materialId, user: req.user._id });
    if (!material) return res.status(404).json({ error: 'Not found' });
    res.json({
      material: {
        id: material._id,
        status: material.status,
        pages: material.pages,
        error: material.error,
        progress: material.progress || 0,
        stage: material.stage || '',
        elapsedMs: Date.now() - new Date(material.createdAt).getTime(),
      },
    });
  } catch (e) { next(e); }
});

// GET /api/projects/:projectId/materials — list documents in a project
router.get('/projects/:projectId/materials', loadProject, async (req, res, next) => {
  try {
    const materials = await Material.find({ project: req.project._id, user: req.user._id })
      .select('filename pages status error progress stage createdAt')
      .sort({ createdAt: -1 })
      .lean();
    const now = Date.now();
    res.json({ materials: materials.map((m) => ({ ...m, elapsedMs: now - new Date(m.createdAt).getTime() })) });
  } catch (e) { next(e); }
});

// DELETE /api/materials/:materialId — removes file, chunks and jobs
router.delete('/materials/:materialId', async (req, res, next) => {
  try {
    const material = await Material.findOne({ _id: req.params.materialId, user: req.user._id });
    if (!material) return res.status(404).json({ error: 'Not found' });
    await deleteMaterialCascade(material._id);
    await logEvent({ user: req.user._id, project: material.project, type: 'material.deleted', payload: { filename: material.filename } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
