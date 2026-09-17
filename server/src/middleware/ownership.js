const Space = require('../models/Space');
const Project = require('../models/Project');

// Ensures :spaceId belongs to req.user
async function loadSpace(req, res, next) {
  const space = await Space.findOne({ _id: req.params.spaceId, user: req.user._id });
  if (!space) return res.status(404).json({ error: 'Space not found' });
  req.space = space;
  next();
}

// Ensures :projectId belongs to req.user (via user field)
async function loadProject(req, res, next) {
  const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  req.project = project;
  next();
}

module.exports = { loadSpace, loadProject };
