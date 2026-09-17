# Known Limitations
- Scanned/image PDFs: no OCR → status `failed` with message. Need Tesseract/Document AI.
- Single-process cron worker (10s poll); use BullMQ+Redis for scale.
- Embeddings: batched ×8, capped input; without a Gemini key the system runs keyword fallback.
- Retrieval: in-memory cosine over ≤500 chunks; move to Atlas Vector Search for scale.
- Auth: JWT without refresh/rotation.
- Render free sleep → cold starts; no streaming tutor yet.
- Costs in Admin are estimates, not billing.
- FIXED since v1.0: AI timeouts (30s everywhere), rate limits (auth/AI/upload),
  Zod validation of all AI outputs, provider abstraction (Gemini ⇄ Mercury),
  repeated-mistake workflow, live rule-based evaluation.

# Future Improvements
- Streaming tutor + source highlight jump-to-page.
- Flashcards + spaced repetition from weak concepts.
- Concept map visualization.
- BullMQ, Redis cache, Atlas Vector Search, refresh tokens, Sentry tracing.
- True background learning chain (quiz-completed → evaluate → mastery → insight → recommend as jobs).

# Future Improvements
- Streaming tutor + source highlight jump-to-page.
- Flashcards + spaced repetition from weak concepts.
- Concept map visualization.
- BullMQ, Redis cache, Atlas Vector Search, refresh tokens, Sentry tracing.
