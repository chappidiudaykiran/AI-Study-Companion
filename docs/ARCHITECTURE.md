# Architecture — AI Study Companion (MERN)

```
React (Vite) UI
  Home / Space / ProjectDashboard / Materials / Tutor / Quiz / Growth / Analytics / Admin
  ↓ Axios + JWT
Express API (/api/...) + auth + validation + checkOwnership
  ↓ Services: pdf, retrieval, ai, quiz, mastery, recommend, jobs, events
MongoDB Atlas + Cloudinary/local uploads + node-cron Worker
  ↓ Gemini 2.5 Flash (generateText / generateStructured / embed)
AiLogs + Events + Jobs collections
```

## Decisions
- MERN only (no Python/Supabase) for speed — dev is MERN.
- Jobs: `jobs` collection + node-cron polling, not Redis/BullMQ. States queued>processing>ready/failed + retries + idempotencyKey.
- Retrieval: Chunk.embedding + cosine in Node, filter projectId. Keyword fallback.
- Auth: JWT + bcrypt + isAdmin. Every query scoped userId; retrieval scoped projectId.

## Simplifications (prototype)
- No real OCR for scanned PDFs → status failed with message.
- Single-process worker (move to BullMQ with scale).
- No streaming tutor v1, no Redis cache.

## What next
Streaming, flashcards/spaced repetition, concept map, BullMQ, Atlas Vector Search.
