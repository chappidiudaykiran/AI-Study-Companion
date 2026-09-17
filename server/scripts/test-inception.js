// Quick live check — reads key from env, never hardcode.
// Usage (PowerShell, NOT committed):
//   $env:INCEPTION_API_KEY="sk_..."
//   node scripts/test-inception.js
// Or put INCEPTION_API_KEY=... in server/.env (ignored by git).
require('dotenv').config();
async function main() {
  const inception = require('../src/services/inceptionClient');
  const q = process.argv[2] || 'What is a diffusion model? Explain in 2 lines.';
  console.log('Model:', process.env.INCEPTION_MODEL || 'mercury-2.5');
  const { text, raw } = await inception.chat([{ role: 'user', content: q }]);
  console.log('--- ANSWER ---');
  console.log(text);
  console.log('--- META ---');
  console.log(JSON.stringify({ model: raw?.model, usage: raw?.usage }, null, 2));
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
