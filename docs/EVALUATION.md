# Evaluation Approach

## Unit (no key): `node server/tests/run.js` — 12 checks
- cosine math, mastery `0.7*old+0.3*new`, growth buckets, evidence gate ≥0.18, chunking, project-isolation rule.

## Curated (10 cases in eval/cases.js)
- T1-T3 grounded tutor (must cite correct doc+page)
- U1-U2 unsupported (must refuse, no cross-project leak)
- R1-R2 retrieval relevance + empty-project path
- Q1-Q2 grading (MCQ exact, open covers/missing)
- C1 recommendation relevance

## How to run live
1. Seed demo user, upload 10-page PDF, wait `ready`.
2. Ask grounded Q → check citation page. Ask off-topic Q → expect refusal.
3. Start quiz (4), answer 1 wrong → mastery for that concept should drop, next recommendation should mention it.
4. Check Admin → ailogs (latency/model), jobs (done), activity.

## Regression note
Prompt/model/retrieval changes re-run unit + 10 cases; log results here before push.
