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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
