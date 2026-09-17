# Evaluation Approach (§14)

## 1. Unit tests — 16/16 pass, no key needed
`cd server && npm test` (`tests/run.js`):
- cosine math (identical/orthogonal/mismatch), chunk splitting
- mastery `0.7*old + 0.3*new` (50+100→65, 80+0→56)
- growth buckets (improving/stable/needs-attention), evidence gate ≥ 0.18
- project-isolation rule, Zod AI-schema rejection (MCQ missing key, score > 100, tutor missing answer)

## 2. Curated cases — 10 in `eval/cases.js`
T1–T3 grounded tutor · U1–U2 unsupported refusal + no cross-project leak · R1–R2 retrieval
relevance + empty-project path · Q1–Q2 grading (MCQ exact, open covered/missing) · C1
recommendation relevance. Run manually per `docs/VIDEO_SCRIPT.md`, or via Admin → Evaluation.

## 3. Live rule-based evaluation — `GET /api/admin/evaluation`
Computed from production data on every load (see `evalService.js`).
Run on 2026-09-17 against dev Atlas (real numbers, not fixtures):

| Metric | Value | Reading |
|---|---|---|
| Tutor answers sampled | 6 | 2 grounded + cited, 4 correct refusals |
| Citation rate (all) | 0.333 | refusals carry no citations by design |
| Citation rate (grounded only) | **1.0 (2/2)** | every grounded answer cited doc + page ✅ |
| Unsupported refusals | 4 | refusal path exercised and working ✅ |
| AI calls logged | 116 | quiz-gen 53, embed 59, tutor 2, concept-extract 2 |
| Overall error rate | 0.509 | entirely `embed` (Gemini key unset → keyword fallback took over by design) |
| Tutor / quiz-gen / concept-extract errors | 0 | structured outputs all validated ✅ |
| Quiz grading volume | 0 | no quizzes taken on this DB yet — grade path covered by unit + manual |

Interpretation: the 0.509 error rate is the fallback system working, not a failure —
every embed failure degraded gracefully to keyword retrieval and every user-facing
AI feature (tutor, quiz-gen, concepts) has zero errors.

## 4. Regression policy
Prompt/model/retrieval changes must re-run `npm test` + Admin → Evaluation and
record the table above before push. Any drop in grounded citation rate or rise in
feature error rates blocks the change.
