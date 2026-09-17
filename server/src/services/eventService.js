const Event = require('../models/Event');

async function logEvent({ user, space = null, project = null, type, payload = {}, key = null }) {
  try {
    if (key) {
      const dup = await Event.findOne({ key }).lean();
      if (dup) return dup; // idempotent — duplicate event skipped
    }
    return await Event.create({ user, space, project, type, payload, key: key || undefined });
  } catch (e) {
    // unique-key race → treat as duplicate, not failure
    if (e.code === 11000) return null;
    console.error('event log failed:', e.message);
    return null;
  }
}

module.exports = { logEvent };
