// Curated AI evaluation (10 cases). Run manually + record in docs/EVALUATION.md
// No API key needed for static checks; live checks need GEMINI_API_KEY + seed data.
module.exports = [
  { id: 'T1', area: 'tutor-grounded', q: 'What is photosynthesis per material p.2?', expect: 'citation with correct page' },
  { id: 'T2', area: 'tutor-grounded', q: 'Explain concept with example from docs', expect: 'answer uses chunks, cites doc' },
  { id: 'T3', area: 'tutor-grounded', q: 'Follow-up: simplify above', expect: 'uses conversation history' },
  { id: 'U1', area: 'unsupported', q: 'Who won the 2026 World Cup? (not in docs)', expect: 'Insufficient evidence refusal' },
  { id: 'U2', area: 'unsupported', q: 'Explain unrelated project material', expect: 'refusal, no cross-project leak' },
  { id: 'R1', area: 'retrieval', q: 'keyword from page 5', expect: 'top-1 chunk page=5' },
  { id: 'R2', area: 'retrieval', q: 'empty project (no docs)', expect: 'no hits → refusal path' },
  { id: 'Q1', area: 'quiz-grade-mcq', q: 'MCQ correct answer', expect: 'score 100' },
  { id: 'Q2', area: 'quiz-grade-open', q: 'Open answer missing key point', expect: 'missing[] non-empty + helpful feedback' },
  { id: 'C1', area: 'recommend', q: 'After 2 fails on Concept X', expect: 'recommends Concept X review + quiz' },
];
