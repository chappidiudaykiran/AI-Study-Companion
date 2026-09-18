const nodemailer = require('nodemailer');

let cached = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (cached) return cached;
  if (!isConfigured()) return null;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return cached;
}

async function sendResetMail({ to, name, link }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = 'Reset your AI Study Companion password';
  const html = `
    <p>Hi ${name || 'there'},</p>
    <p>Someone requested a password reset for your AI Study Companion account.</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p>
    <p>Or paste this link: ${link}</p>
    <p>This link expires in 1 hour. If you did not request it, ignore this mail.</p>`;
  if (!isConfigured()) {
    // Dev fallback: no SMTP → log link server-side (never expose address validity)
    console.log(`[mailer:dev] SMTP not configured. Reset link for ${to}: ${link}`);
    return { delivered: false, dev: true };
  }
  await getTransport().sendMail({ from, to, subject, html });
  return { delivered: true, dev: false };
}

module.exports = { sendResetMail, isConfigured };
