# AI Usage

## AI used to BUILD the product
- Coding assistant (Muse Spark via OpenCode): scaffold, Mongoose schemas, Express routes, React pages, worker, docs.
- Debugging: syntax checks via `node --check`, error triage.
- No auto-generated undisclosed code — all reviewed before commit.

## AI used BY the final product (runtime)
- Tutor answers: Gemini 2.5 Flash (`generateText`/`generateStructured`), grounded in project chunks.
- Embeddings: `text-embedding-004` stored on Chunk, cosine top-k + keyword fallback.
- Quiz generation + open-ended grading + concept extraction + recommendations: structured Gemini calls.
- All runtime calls logged to `AiLog` (model, feature, latency, tokens, status) visible in Admin.
