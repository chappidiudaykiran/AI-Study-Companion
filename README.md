# AI Study Companion — MERN + RAG Prototype

Persistent, contextual, measurable AI learning companion.
**Stack:** React (Vite) + Express + MongoDB Atlas + Gemini 2.5 Flash / InceptionLabs Mercury-2.5.

## Quick start (local)

```powershell
# backend
Set-Location server
npm install
Copy-Item .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, AI_PROVIDER, INCEPTION_API_KEY / GEMINI_API_KEY
npm run dev        # health: http://localhost:5000/health
npm run seed       # demo@test.com/demo123 + admin@test.com/admin123
npm test           # 16 unit checks, no key needed

# frontend (new terminal)
Set-Location ../client
npm install
npm run dev        # http://localhost:5173 (set VITE_API_URL in client/.env)
```

## Learning loop (demo in this order)
Space → Project (goal) → Upload PDF → wait `ready` → Tutor (cited answer) →
off-topic Q (refusal) → Quiz (MCQ + open) → Mastery/Growth → Analytics →
Recommendation → Admin (`/admin` as admin user).

## Structure
```
client/ — Vite React: Home (continue/attention/next), Project (overview/materials/
  tutor-chat/quiz/growth/analytics), Admin (users/journey/eval/jobs/logs)
server/src — routes/ (auth spaces projects materials tutor quiz analytics admin)
  services/ (pdf retrieval context mastery recommend aiClient inceptionClient
  jobWorker eventService evalService) middleware/ (auth ownership rateLimit)
  models/ (17: User Space Project Material Chunk Concept Question Attempt Mastery
  Message Recommendation LearningContext Event AiLog Job)
server/tests/run.js — 16 checks · eval/cases.js — 10 curated cases
docs/ — ARCHITECTURE (mermaid) AI_USAGE PROMPTS EVALUATION (live results)
  LIMITATIONS_FUTURE VIDEO_SCRIPT
render.yaml — Render backend config · client/vercel.json — Vercel SPA config
```

## Environment (never commit `.env`)
See `server/.env.example`: `MONGO_URI JWT_SECRET AI_PROVIDER
INCEPTION_API_KEY INCEPTION_MODEL GEMINI_API_KEY AI_TIMEOUT_MS CLIENT_URL`.

## API summary (all JWT, all project-scoped to caller)
- `POST /api/auth/register|/login`, `GET /api/auth/me`
- `CRUD /api/spaces`, `POST /api/projects`, `GET /api/projects/:id`
- `POST /api/projects/:id/materials`, `GET /api/materials/:id/status`
- `POST /api/projects/:id/tutor`, `GET .../tutor/history`
- `POST /api/projects/:id/quiz/start`, `POST /api/quiz/:qid/answer`, `GET .../mastery`
- `GET .../growth|/recommendations|/analytics`, `GET /api/analytics/global`
- `GET /api/admin/overview|/users|/users/:id/journey|/spaces|/projects|/activity|/ailogs|/jobs|/evaluation`, `POST /api/admin/jobs/:id/retry`

## Deploy (for you later)
1. Atlas: Network Access `0.0.0.0/0`, user + `ai-study-companion` DB.
2. Render: New Web Service from repo, `render.yaml` fills build/start; set secret env vars.
3. Vercel: import `client/`, set `VITE_API_URL` to Render URL.
4. `npm run seed` against prod DB, smoke-test loop, record video per `docs/VIDEO_SCRIPT.md`.

## Docs map (§20)
Working app → deploy above · Video → `docs/VIDEO_SCRIPT.md` · Arch → `docs/ARCHITECTURE.md` ·
AI usage → `docs/AI_USAGE.md` · Prompts → `docs/PROMPTS.md` · Evaluation → `docs/EVALUATION.md` ·
Limitations/Future → `docs/LIMITATIONS_FUTURE.md`.
