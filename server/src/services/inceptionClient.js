// InceptionLabs provider (mercury-2.5) — key NEVER hardcoded, read from env.
// Env: INCEPTION_API_KEY, INCEPTION_MODEL (default mercury-2.5), INCEPTION_REASONING (default low)
const BASE_URL = process.env.INCEPTION_BASE_URL || 'https://api.inceptionlabs.ai/v1/chat/completions';
const INCEPTION_TIMEOUT_MS = Number(process.env.INCEPTION_TIMEOUT_MS) || 30000;

function cfg() {
  const apiKey = process.env.INCEPTION_API_KEY;
  if (!apiKey) throw new Error('INCEPTION_API_KEY missing. Set in server/.env (never commit)');
  return {
    apiKey,
    model: process.env.INCEPTION_MODEL || 'mercury-2.5',
    reasoning: process.env.INCEPTION_REASONING || 'low',
  };
}

async function chat(messages, { jsonMode = false } = {}) {
  const { apiKey, model, reasoning } = cfg();
  const body = { model, reasoning_effort: reasoning, messages };
  // hint JSON when needed (provider may ignore, we parse defensively)
  if (jsonMode) {
    body.messages = [
      { role: 'system', content: 'Return ONLY valid JSON, no markdown fences.' },
      ...messages,
    ];
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INCEPTION_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? `Inception timed out after ${INCEPTION_TIMEOUT_MS}ms` : e.message);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Inception ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
  if (!text) throw new Error('Empty response from InceptionLabs');
  return { text, raw: data };
}

async function generateText(prompt) {
  const { text } = await chat([{ role: 'user', content: prompt }]);
  return text;
}

async function generateStructured(prompt) {
  const raw = await generateText(`${prompt}\n\nReturn ONLY valid JSON, no markdown fences.`);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const fixed = await generateText(`Fix this into valid JSON only:\n${cleaned}`);
    return JSON.parse(fixed.replace(/```json|```/g, '').trim());
  }
}

module.exports = { chat, generateText, generateStructured };
