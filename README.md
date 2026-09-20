# AI Study Companion — AI-Powered Learning & Growth Workspace

A persistent, contextual, measurable AI learning companion (MERN + RAG).
Learners organize study into **Spaces → Projects**, upload PDFs, learn with a
**grounded AI Tutor** (doc + page citations, honest refusals), take **adaptive
quizzes** (MCQ + open-ended), track **concept mastery**, and get **growth analysis,
recommendations**, **flashcards**, and rich **analytics** — with an **Admin Dashboard**
for users, activity, AI usage/quality, jobs, and system health.

## The learning loop

Space → Project (goal) → Upload PDF → background processing (`queued → processing → ready`)
→ Tutor (cited answer) → off-topic question (refusal) → Adaptive Quiz → open-ended
grading (`covered`/`missing`/feedback) → Mastery update → mistake-pattern detection
→ Growth → Recommendations → Flashcards drill → Analytics → continue learning.

## Key features

- **Auth** — JWT register/login, profile edit, password change, forgot/reset via mail.
- **Spaces & Projects** — goal-driven workspaces, ownership-enforced, cascade delete.
- **Materials** — PDF upload (15 MB), async pipeline: parse → chunk (~800 tok + page)
  → embed → concept extraction → searchable knowledge. Statuses + retries + orphan recovery.
- **AI Tutor** — project-scoped RAG (vector + keyword fallback), learner-profile injection
  (weaknesses, accuracy, mistakes), chat UI with LaTeX + Markdown rendering, citations,
  suggestion chips, conversation history + fresh-start.
- **Adaptive Quiz** — evidence-based concept picker (never naive wrong→easy), MCQ +
  open-ended, structured AI grading, per-question timers/practice modes.
- **Mastery & Growth** — `0.7·old + 0.3·new` estimates with history, improving/stable/
  needs-attention buckets.
- **Recommendations** — weakest-concept next steps (cached, deduped) + repeated-mistake
  targeted recs.
- **Flashcards** — adaptive drill deck with spaced-review tracking.
- **Analytics** — project charts (mastery bars, score trend, activity) + Global Analytics
  + learner **Dashboard** (loop tracker, continue, attention).
- **Persistent context** — `LearningContext` (strengths/weaknesses/repeated mistakes)
  rebuilt from real evidence, injected into Tutor.
- **AI engineering** — provider switch (`AI_PROVIDER=gemini|inception`), 30 s timeouts,
  rate limits, Zod-validated structured outputs, prompt-injection guards, `AiLog`
  (model, latency, tokens, cost estimate, retrieval IDs), rule-based live evaluation
  (`GET /api/admin/evaluation`).
- **Admin** — overview, users + journey drill-down, spaces/projects, filterable activity,
  AI logs, job retry, evaluation panel. Admins land on a full-page dashboard.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, Tailwind v3, Recharts, KaTeX, lucide-react |
| Backend | Node 22 + Express 4 + Mongoose 8 |
| Database | MongoDB Atlas (17 collections) |
| AI | Gemini 2.5 Flash / InceptionLabs Mercury-2.5 (switchable), `text-embedding-004` |
| Jobs | `jobs` collection + node-cron (states, retries ×3, idempotency, orphan recovery) |
| Mail | Nodemailer (SMTP, forgot/reset + dev-console fallback) |
| Deploy | Railway (API) + Vercel (web) |

## Repository structure

```
client/ — pages (Home, Project, Tutor/Quiz/Growth/Analytics tabs, Flashcards,
  Dashboard, GlobalAnalytics, Admin, Profile, Login, Forgot/ResetPassword),
  components (StudyCard, MathText, Shimmer), api client, theme (Ecurve tokens)
server/ — server.js
  src/routes/ auth spaces projects materials tutor quiz flashcards analytics admin
  src/services/ pdfService retrievalService contextService masteryService
    recommendService evalService aiClient inceptionClient jobWorker
    eventService mailer cleanup
  src/middleware/ auth ownership rateLimit
  src/models/ User Space Project Material Chunk Concept Question Attempt Mastery
    Message Recommendation LearningContext Flashcard FlashcardReview Event AiLog Job
  tests/run.js (16 checks) · seed.js · scripts/test-inception.js
eval/cases.js — 10 curated AI cases
docs/ — ARCHITECTURE (mermaid) AI_USAGE PROMPTS EVALUATION (live results)
  LIMITATIONS_FUTURE VIDEO_SCRIPT
render.yaml · client/vercel.json — deploy configs
```

## Run locally

Prerequisites: Node 18+, MongoDB Atlas account (or local Mongo), Gemini or
InceptionLabs API key.

```powershell
# backend
Set-Location server
npm install
Copy-Item .env.example .env   # then fill values (table below)
npm run dev                   # http://localhost:5000/health
npm run seed                  # demo + admin accounts
npm test                      # 16 checks, no key needed

# frontend (new terminal)
Set-Location ../client
npm install
"VITE_API_URL=http://localhost:5000" | Set-Content .env
npm run dev                   # http://localhost:5173
```

## Environment (never commit `.env`)

| Key | Purpose |
|---|---|
| `MONGO_URI` | Atlas connection string (`.../ai-study-companion`) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Auth signing (`7d`) |
| `CLIENT_URL` | Frontend origin for CORS + reset links |
| `AI_PROVIDER` | `gemini` or `inception` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Tutor/quiz/grading/concepts (or fallback) |
| `INCEPTION_API_KEY` / `INCEPTION_MODEL` | Mercury chat completions |
| `AI_TIMEOUT_MS` / `INCEPTION_TIMEOUT_MS` | 30000 |
| `AI_PRICE_PER_1M` | Optional cost override |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | Forgot-password mail (dev: links print to console) |
| `MAX_PDF_MB` | 15 |
| `VITE_API_URL` (client) | Backend base URL (baked at Vite build time!) |

## API summary (JWT; every project call is ownership-checked)

- Auth: `POST register|login|forgot-password|reset-password`, `GET me`,
  `PATCH profile`, `POST change-password`
- Spaces/Projects: CRUD + `DELETE` cascade, per-project stats, global summary
  (`recentProjects`, `attention`, `nextAction`)
- Materials: upload, status, list, `DELETE` cascade
- Tutor: ask (RAG + citations + refusal), history, `DELETE` history
- Quiz: adaptive start, answer (MCQ auto + AI open grading), mastery, growth,
  recommendations, analytics
- Flashcards: list, adaptive generate, review
- Admin: overview, users, `users/:id/journey`, spaces, projects, activity
  (user/type/project/space/date filters), ailogs, jobs + retry, `evaluation`

## Testing & evaluation

- `npm test` — 16 unit checks (retrieval math, mastery, growth buckets, evidence
  gate, AI-schema rejection, isolation rule).
- `eval/cases.js` — 10 curated cases (grounded T1–T3, unsupported U1–U2,
  retrieval R1–R2, grading Q1–Q2, recommendation C1).
- `GET /api/admin/evaluation` — live rule-based metrics (citation rate, refusals,
  per-feature latency/error) computed from production data.
- Regression rule: prompts/models/retrieval changes re-run tests + evaluation first.

## Deploy

- **API (Railway):** Root `server`, build `npm install`, start `npm start`;
  set secret env vars; generate domain; add volume `/app/server/uploads` (1 GB);
  verify `/health`. Redeploy to pick up `main`.
- **Web (Vercel):** import repo, Root `client`, env `VITE_API_URL` = Railway URL
  (**Config** type, then **Redeploy** — Vite bakes it at build time).
- Set Railway `CLIENT_URL` to the Vercel URL. Seed prod once. Smoke-test the loop.

## Accounts & docs

- Learner/admin accounts are provisioned and shared by mail (seed defaults exist
  for local dev only).
- Full spec mapping: `docs/` (architecture diagram + decisions, AI usage,
  every prompt, live evaluation results, limitations/future, video script).
- PRD: `Project_Requirements.pdf`. Prototype scope: no OCR, no streaming tutor,
  single-process worker, estimated (not billed) AI costs.
