# AI Study Companion — MERN Prototype

Persistent, contextual, measurable AI learning companion.
Stack: React (Vite) + Express + MongoDB Atlas + Gemini 2.5 Flash.

## Quick start (Day 0)

```powershell
# backend
Set-Location server
npm install
Copy-Item .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev
# frontend (new terminal)
Set-Location ../client
npm install
npm run dev
```

Backend: http://localhost:5000/health | Frontend: http://localhost:5173

## Structure
```
client/ — React Vite (Home, Spaces, Project, Tutor, Quiz, Growth, Analytics, Admin)
server/ — Express API + Mongoose + node-cron worker + Gemini wrapper
docs/ — ARCHITECTURE, AI_USAGE, PROMPTS, EVALUATION, LIMITATIONS
eval/ — 10 curated AI test cases
```

## Env (never commit .env)
See `server/.env.example`.

## Deploy
Backend → Render, Frontend → Vercel, DB → Atlas M0. See DayWise Plan PDF.

## Push discipline
Small commits per feature. See commit plan in chat.
