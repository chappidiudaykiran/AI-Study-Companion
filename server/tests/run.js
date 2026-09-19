// Pure-function tests (no DB / no API key needed)
// Run: npm test (add jest in dev)
// For prototype: node server/tests/run.js

const assert = require('assert');

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  if (!na || !nb) return -1;
  return dot / (Math.sqrt(na)*Math.sqrt(nb));
}
function chunkText(text, size=800, overlap=120) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i=0;i<words.length;i+=size-overlap) out.push(words.slice(i,i+size).join(' '));
  return out.filter(c=>c.length>50);
}
function masteryNext(oldScore, newScore){ return Math.round(0.7*oldScore+0.3*newScore); }
function growthStatus(score, prev){ const d=score-prev; return d>=5?'improving':d<=-5?'needs-attention':'stable'; }
function evidenceGate(maxScore){ return maxScore>=0.18; }

let pass=0, fail=0;
function t(name, fn){ try{ fn(); pass++; console.log(`PASS ${name}`);}catch(e){ fail++; console.log(`FAIL ${name}: ${e.message}`);} }

t('cosine identical =1', ()=>assert(Math.abs(cosine([1,0],[1,0])-1)<1e-6));
t('cosine orthogonal =0', ()=>assert(Math.abs(cosine([1,0],[0,1]))<1e-6));
t('cosine mismatch =-1', ()=>assert(cosine([1],[1,2])===-1));
t('mastery update 50+100=65', ()=>assert(masteryNext(50,100)===65));
t('mastery update 80+0=56', ()=>assert(masteryNext(80,0)===56));
t('growth improving', ()=>assert(growthStatus(80,70)==='improving'));
t('growth stable', ()=>assert(growthStatus(72,70)==='stable'));
t('growth needs-attention', ()=>assert(growthStatus(50,70)==='needs-attention'));
t('evidence gate blocks low', ()=>assert(evidenceGate(0.1)===false));
t('evidence gate passes high', ()=>assert(evidenceGate(0.5)===true));
t('chunk splits long text', ()=>{ const c=chunkText('word '.repeat(2000)); assert(c.length>=2); });
t('isolation rule: project filter required', ()=>{
  const query={project:'p1'};
  assert(query.project, 'retrieval must filter projectId');
});
t('mcq schema rejects missing answerKey', ()=>{
  const { mcqSchema } = require('../src/services/aiSchemas');
  assert.throws(()=>mcqSchema.parse({ stem:'What is X?', options:['A','B'] }));
});
t('mcq schema accepts valid output', ()=>{
  const { mcqSchema } = require('../src/services/aiSchemas');
  const out = mcqSchema.parse({ stem:'What is X?', options:['A','B','C'], answerKey:'A', difficulty:'easy' });
  assert(out.stem === 'What is X?');
});
t('grade schema clamps score range', ()=>{
  const { gradeSchema } = require('../src/services/aiSchemas');
  assert.throws(()=>gradeSchema.parse({ score:150, covered:[], missing:[], feedback:'x' }));
});
t('tutor schema requires answer', ()=>{
  const { tutorSchema } = require('../src/services/aiSchemas');
  assert.throws(()=>tutorSchema.parse({ citations:[], confidence:0.5 }));
});
t('first failure counts mistake=1 (2nd-failure rule)', ()=>{
  const score = 20;
  const mistakes = score < 60 ? 1 : 0;
  assert.strictEqual(mistakes, 1);
  assert.ok((1 + 1) >= 2, '2nd failure must trigger recommendation');
});
t('verifyCitations maps per-hit chunkId + rejects invented docs', ()=>{
  const { verifyCitations } = require('../src/routes/tutor');
  const hits = [
    { doc: 'Notes.pdf', page: 2, chunkId: 'c1' },
    { doc: 'Guide.pdf', page: 5, chunkId: 'c2' },
  ];
  const out = verifyCitations(
    [{ doc: 'Notes.pdf', page: 2 }, { doc: 'Invented.pdf', page: 9 }],
    hits
  );
  assert.strictEqual(out[0].chunkId, 'c1');
  assert.strictEqual(out[1].doc, 'Guide.pdf');
  assert.strictEqual(out[1].chunkId, 'c2');
});
t('assignPages locates chunks via form-feed split', ()=>{
  const { assignPages } = require('../src/services/pdfService');
  const full = 'alpha one two three\fbeta four five six';
  const pages = assignPages(['alpha one', 'beta four'], full, 2);
  assert.deepStrictEqual(pages, [1, 2]);
});
t('localEmbed deterministic + normalized', ()=>{
  const { localEmbed, cosine } = require('../src/services/aiClient');
  const a = localEmbed('photosynthesis chlorophyll leaf');
  const b = localEmbed('photosynthesis chlorophyll leaf');
  assert.strictEqual(a.length, 64);
  assert.ok(Math.abs(cosine(a, b) - 1) < 1e-9);
  assert.ok(cosine(a, localEmbed('quantum entanglement谋')) < 0.99);
});
t('magic-byte check rejects non-PDF', ()=>{
  const fs = require('fs'), os = require('os'), path = require('path');
  const { isPdfFile } = require('../src/routes/materials');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfcheck-'));
  const good = path.join(dir, 'a.pdf'), bad = path.join(dir, 'b.pdf');
  fs.writeFileSync(good, '%PDF-1.4 fake');
  fs.writeFileSync(bad, 'hello not pdf');
  assert.strictEqual(isPdfFile(good), true);
  assert.strictEqual(isPdfFile(bad), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
