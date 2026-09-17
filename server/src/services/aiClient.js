// Provider abstraction: generateText / generateStructured / embed
// Uses Gemini 2.5 Flash. Swap to OpenAI by changing this file only.
const { GoogleGenerativeAI } = require('@google/generative-ai');
const AiLog = require('../models/AiLog');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

function client() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

async function logUsage({ user, project, feature, latency_ms, tokens = 0, status = 'ok', error = '', retrievalIds = [] }) {
  try {
    await AiLog.create({
      user, project, feature, model: MODEL, latency_ms, tokens,
      cost_est: 0, status, error, retrievalIds,
    });
  } catch (e) { console.error('ailog failed', e.message); }
}

async function generateText(prompt, { user = null, project = null, feature = 'tutor' } = {}) {
  const t0 = Date.now();
  try {
    const gen = client().getGenerativeModel({ model: MODEL });
    const result = await gen.generateContent(prompt);
    const text = result.response.text();
    await logUsage({ user, project, feature, latency_ms: Date.now() - t0, tokens: Math.ceil((prompt.length + text.length) / 4) });
    return text;
  } catch (e) {
    await logUsage({ user, project, feature, latency_ms: Date.now() - t0, status: 'error', error: e.message });
    throw e;
  }
}

async function generateStructured(prompt, { user = null, project = null, feature = 'structured' } = {}) {
  const raw = await generateText(`${prompt}\n\nReturn ONLY valid JSON, no markdown fences.`, { user, project, feature });
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // one retry: ask to fix JSON
    const fixed = await generateText(`Fix this into valid JSON only:\n${cleaned}`, { user, project, feature });
    return JSON.parse(fixed.replace(/```json|```/g, '').trim());
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
      const r = await model.embedContent(t.slice(0, 8000));
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
