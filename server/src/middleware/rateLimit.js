const { rateLimit } = require('express-rate-limit');

function limiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
  });
}

// Brute-force guard on auth (§15)
const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many auth attempts, try again in 15 minutes',
});

// AI-backed endpoints: cost + latency guard (§15 performance)
const aiLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 20,
  message: 'AI rate limit reached, wait a minute and retry',
});

// Uploads: size already capped by multer; count guard here
const uploadLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 10,
  message: 'Too many uploads, wait a minute and retry',
});

module.exports = { authLimiter, aiLimiter, uploadLimiter };
