const Event = require('../models/Event');

async function logEvent({ user, space = null, project = null, type, payload = {} }) {
  try {
    await Event.create({ user, space, project, type, payload });
  } catch (e) {
    console.error('event log failed:', e.message);
  }
}

module.exports = { logEvent };
