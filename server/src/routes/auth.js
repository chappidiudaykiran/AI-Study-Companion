const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { sendResetMail, isConfigured } = require('../services/mailer');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

function sign(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: data.email });
    if (exists) return res.status(409).json({ error: 'Email already used' });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({ name: data.name, email: data.email, passwordHash });
    const token = sign(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (e) {
    next(e);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = sign(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (e) {
    next(e);
  }
});

router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

const profileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  email: z.string().email().optional(),
});

// PATCH /api/auth/profile — edit name/email
router.patch('/profile', auth, async (req, res, next) => {
  try {
    const data = profileSchema.parse(req.body);
    if (data.email && data.email.toLowerCase() !== req.user.email) {
      const exists = await User.findOne({ email: data.email.toLowerCase() });
      if (exists) return res.status(409).json({ error: 'Email already used' });
      req.user.email = data.email.toLowerCase();
    }
    if (data.name) req.user.name = data.name.trim();
    await req.user.save();
    res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, isAdmin: req.user.isAdmin, createdAt: req.user.createdAt } });
  } catch (e) {
    next(e);
  }
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(6).max(100),
});

// POST /api/auth/change-password — verify current, set new
router.post('/change-password', auth, async (req, res, next) => {
  try {
    const data = passwordSchema.parse(req.body);
    const user = await User.findById(req.user._id);
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    if (data.currentPassword === data.newPassword) {
      return res.status(400).json({ error: 'New password must differ from current' });
    }
    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/forgot-password {email} — always generic reply (no account leak)
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const generic = { ok: true, message: 'If an account exists for this email, a reset link was sent' };
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(generic);
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const sent = await sendResetMail({ to: user.email, name: user.name, link });
    // Dev convenience only: expose link when no SMTP is configured AND not production
    if (sent.dev && process.env.NODE_ENV !== 'production') {
      return res.json({ ...generic, devLink: link });
    }
    res.json(generic);
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/reset-password {token, newPassword}
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const data = z.object({ token: z.string().min(10).max(200), newPassword: z.string().min(6).max(100) }).parse(req.body);
    const hash = crypto.createHash('sha256').update(data.token).digest('hex');
    const user = await User.findOne({
      resetTokenHash: hash,
      resetTokenExpiry: { $gt: new Date() },
    }).select('+resetTokenHash +resetTokenExpiry');
    if (!user) return res.status(400).json({ error: 'Reset link is invalid or expired' });
    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    user.resetTokenHash = null;
    user.resetTokenExpiry = null;
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
