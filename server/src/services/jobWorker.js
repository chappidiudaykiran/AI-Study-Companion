const cron = require('node-cron');
const Job = require('../models/Job');
const { processMaterial } = require('./pdfService');
const { logEvent } = require('./eventService');

let running = false;
const STALE_MS = 2 * 60 * 1000; // jobs processing longer than this are orphans

// Orphan recovery (§13): dev restarts (node --watch) or crashes can leave jobs
// stuck in `processing` forever since the poller only claims `queued`.
async function recoverOrphans() {
  try {
    const stale = await Job.find({ status: 'processing', updatedAt: { $lt: new Date(Date.now() - STALE_MS) } });
    for (const job of stale) {
      job.retries += 1;
      if (job.retries >= 3) {
        job.status = 'failed';
        job.error = 'orphaned too many times — inspect material and retry manually';
      } else {
        job.status = 'queued';
        job.error = 'recovered-orphan: worker restarted mid-job, will retry';
      }
      await job.save();
    }
    if (stale.length) console.log(`Recovered ${stale.length} orphan job(s)`);
  } catch (e) {
    console.error('orphan recovery failed:', e.message);
  }
}

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
  recoverOrphans();
  cron.schedule('*/10 * * * * *', runOnce); // every 10s
  console.log('Job worker started (10s poll)');
}

module.exports = { startWorker, runOnce };
