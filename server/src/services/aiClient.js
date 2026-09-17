// Provider abstraction: generateText / generateStructured / embed
// Env AI_PROVIDER=gemini (default) | inception. Swap without touching callers.
const { GoogleGenerativeAI } = require('@google/generative-ai');
const AiLog = require('../models/AiLog');

const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const MODEL = PROVIDER === 'inception'
  ? (process.env.INCEPTION_MODEL || 'mercury-2.5')
  : (process.env.GEMINI_MODEL || 'gemini-2.5-flash');
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30000;

// Approximate blended price per 1M tokens (input+output avg). Override via
// AI_PRICE_PER_1M env. Treat Admin cost figures as estimates, not billing.
const PRICING_PER_1M = {
  'gemini-2.5-flash': 1.0,
  'mercury-2.5': 0.5,
};
const DEFAULT_PRICE_PER_1M = Number(process.env.AI_PRICE_PER_1M) || null;

// Timeout guard (§15): no AI call may hang forever (previously caused stuck jobs)
function withTimeout(promise, ms = AI_TIMEOUT_MS, label = 'AI call') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function client() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

async function logUsage({ user, project, feature, latency_ms, tokens = 0, status = 'ok', error = '', retrievalIds = [] }) {
  try {
    const price = DEFAULT_PRICE_PER_1M ?? PRICING_PER_1M[MODEL] ?? 0.5;
    await AiLog.create({
      user, project, feature, model: MODEL, latency_ms, tokens,
      cost_est: +((tokens / 1e6) * price).toFixed(6), status, error, retrievalIds,
    });
  } catch (e) { console.error('ailog failed', e.message); }
}

async function generateText(prompt, { user = null, project = null, feature = 'tutor', retrievalIds = [] } = {}) {
  const t0 = Date.now();
  // InceptionLabs path (chat completions API)
  if (PROVIDER === 'inception') {
    try {
      const { chat } = require('./inceptionClient');
      const { text, raw } = await withTimeout(chat([{ role: 'user', content: prompt }]), AI_TIMEOUT_MS, `inception:${feature}`);
      // real provider-reported usage when available; estimate otherwise
      const usage = raw?.usage || {};
      const realTokens = usage.total_tokens || Math.ceil((prompt.length + text.length) / 4);
      await logUsage({ user, project, feature, latency_ms: Date.now() - t0, tokens: realTokens, retrievalIds });
      return text;
    } catch (e) {
      await logUsage({ user, project, feature, latency_ms: Date.now() - t0, status: 'error', error: e.message, retrievalIds });
      throw e;
    }
  }
  try {
    const gen = client().getGenerativeModel({ model: MODEL });
    const result = await withTimeout(gen.generateContent(prompt), AI_TIMEOUT_MS, `gemini:${feature}`);
    const text = result.response.text();
    await logUsage({ user, project, feature, latency_ms: Date.now() - t0, tokens: Math.ceil((prompt.length + text.length) / 4), retrievalIds });
    return text;
  } catch (e) {
    await logUsage({ user, project, feature, latency_ms: Date.now() - t0, status: 'error', error: e.message, retrievalIds });
    throw e;
  }
}

function cleanJson(raw) {
  return String(raw).replace(/```json|```/g, '').trim();
}

// Structured outputs are schema-validated before persist/use (§8).
// Pass a Zod schema; invalid output triggers one fix-retry, then throws.
async function generateStructured(prompt, opts = {}, schema = null) {
  const { user = null, project = null, feature = 'structured' } = opts;
  const raw = await generateText(`${prompt}\n\nReturn ONLY valid JSON, no markdown fences.`, opts);
  const tryParse = (text) => {
    const parsed = JSON.parse(cleanJson(text));
    return schema ? schema.parse(parsed) : parsed;
  };
  try {
    return tryParse(raw);
  } catch (e) {
    // one retry: ask to fix, then validate again
    const fixed = await generateText(`Fix this into valid JSON matching the required schema, output JSON only:\n${cleanJson(raw).slice(0, 4000)}`, opts);
    return tryParse(fixed);
  }
}

async function embed(texts, { user = null, project = null } = {}) {
  const t0 = Date.now();
  try {
    const gen = client().getGenerativeModel({ model: EMBED_MODEL });
    // Gemini embed API via generate: use embedContent
    const model = client().getGenerativeModel({ model: EMBED_MODEL });
    const out = [];
    for (const t of texts) {
      const r = await withTimeout(model.embedContent(t.slice(0, 8000)), AI_TIMEOUT_MS, 'gemini:embed');
      out.push(r.embedding.values);
    }
    await logUsage({ user, project, feature: 'embed', latency_ms: Date.now() - t0, tokens: Math.ceil(texts.join('').length / 4) });
    return out;
  } catch (e) {
    await logUsage({ user, project, feature: 'embed', latency_ms: Date.now() - t0, status: 'error', error: e.message });
    throw e;
  }
}

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = { generateText, generateStructured, embed, cosine, MODEL };
