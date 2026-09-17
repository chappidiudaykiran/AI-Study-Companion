const cron = require('node-cron');
const Job = require('../models/Job');
const { processMaterial } = require('./pdfService');
const { logEvent } = require('./eventService');

let running = false;

async function runOnce() {
  if (running) return;
  running = true;
  try {
    const job = await Job.findOneAndUpdate(
      { status: 'queued' },
      { $set: { status: 'processing' } },
      { sort: { createdAt: 1 }, new: true }
    );
    if (!job) return;
    try {
      if (job.type === 'doc-process') {
        await processMaterial(job.refId);
        job.status = 'done';
        await job.save();
        await logEvent({ user: job.user, project: job.project, type: 'material.ready', payload: { materialId: job.refId } });
      } else {
        job.status = 'failed';
        job.error = 'Unknown job type';
        await job.save();
      }
    } catch (e) {
      job.retries += 1;
      if (job.retries >= 3) {
        job.status = 'failed';
        job.error = e.message.slice(0, 500);
      } else {
        job.status = 'queued'; // retry
        job.error = e.message.slice(0, 500);
      }
      await job.save();
    }
  } finally {
    running = false;
  }
}

function startWorker() {
  cron.schedule('*/10 * * * * *', runOnce); // every 10s
  console.log('Job worker started (10s poll)');
}

module.exports = { startWorker, runOnce };
