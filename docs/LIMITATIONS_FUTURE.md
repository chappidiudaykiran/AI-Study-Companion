# Known Limitations
- Scanned/image PDFs: no OCR → status `failed` with message. Need Tesseract/Document AI.
- Single-process cron worker (10s poll); use BullMQ+Redis for scale.
- Embeddings cost/latency: batched x8, capped input; large docs slow on free tier.
- Retrieval: in-memory cosine over ≤500 chunks; move to Atlas Vector Search for scale.
- Auth: JWT without refresh/rotation; no rate-limit hardening beyond prototype.
- Render free sleep → cold starts; no streaming tutor yet.

# Future Improvements
- Streaming tutor + source highlight jump-to-page.
- Flashcards + spaced repetition from weak concepts.
- Concept map visualization.
- BullMQ, Redis cache, Atlas Vector Search, refresh tokens, Sentry tracing.
