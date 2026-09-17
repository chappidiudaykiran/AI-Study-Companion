# AI Usage

## AI used to BUILD the product
- Coding assistant (Muse Spark via OpenCode): scaffold, Mongoose schemas, Express routes, React pages, worker, docs.
- Debugging: syntax checks via `node --check`, error triage.
- No auto-generated undisclosed code — all reviewed before commit.

## AI used BY the final product (runtime)
- Provider switch `AI_PROVIDER=gemini|inception` (`aiClient.js` + `inceptionClient.js`):
  Gemini 2.5 Flash or InceptionLabs Mercury-2.5 — no caller changes.
- Tutor answers: grounded in project chunks, learner-profile injection (weaknesses,
  strengths, accuracy), citations, refusal path.
- Embeddings: `text-embedding-004` stored on Chunk, cosine top-k + keyword fallback
  (system works with zero AI keys in keyword mode).
- Quiz generation (parallel) + open-ended grading + concept extraction +
  recommendations: schema-validated structured calls (Zod, fix-retry once).
- All runtime calls logged to `AiLog` (model, feature, latency, tokens,
  cost estimate, retrieval chunk IDs, status) visible in Admin.
- Costs are estimates (blended per-1M pricing, env-overridable); Inception token
  counts are provider-reported, others estimated.
