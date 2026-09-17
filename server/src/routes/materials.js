const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Material = require('../models/Material');
const Job = require('../models/Job');
const { auth } = require('../middleware/auth');
const { loadProject } = require('../middleware/ownership');
const { logEvent } = require('../services/eventService');

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
router.post('/projects/:projectId/materials', loadProject, upload.single('pdf'), async (req, res, next) => {
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
    res.status(201).json({ material });
  } catch (e) { next(e); }
});

// GET /api/materials/:materialId/status
router.get('/materials/:materialId/status', async (req, res, next) => {
  try {
    const material = await Material.findOne({ _id: req.params.materialId, user: req.user._id });
    if (!material) return res.status(404).json({ error: 'Not found' });
    res.json({ material: { id: material._id, status: material.status, pages: material.pages, error: material.error } });
  } catch (e) { next(e); }
});

module.exports = router;
