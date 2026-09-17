import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UploadCloud, MessagesSquare, ListChecks, TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';
import api from '../api/client.js';

const TABS = [
  { id: 'materials', label: 'Materials', icon: UploadCloud, hint: 'Upload PDF here first' },
  { id: 'tutor', label: 'Tutor', icon: MessagesSquare, hint: 'Ask, get cited answers' },
  { id: 'quiz', label: 'Quiz', icon: ListChecks, hint: 'Test understanding' },
  { id: 'growth', label: 'Growth', icon: TrendingUp, hint: 'Mastery + next step' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, hint: 'Activity + scores' },
];

export default function Project() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('materials');
  const [file, setFile] = useState(null);
  const [matStatus, setMatStatus] = useState('');
  const [q, setQ] = useState('');
  const [chat, setChat] = useState([]);
  const [asking, setAsking] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [mastery, setMastery] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [rec, setRec] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get(`/api/projects/${id}`).then((r) => setProject(r.data.project)).catch(() => {});
    api.get(`/api/projects/${id}/tutor/history`).then((r) => setChat(r.data.messages || [])).catch(() => {});
    refreshStats();
  }, [id]);

  async function refreshStats() {
    try {
      const m = await api.get(`/api/projects/${id}/mastery`);
      setMastery(m.data.mastery || []);
      const g = await api.get(`/api/projects/${id}/growth`);
      setGrowth(g.data.growth || []);
      const r = await api.get(`/api/projects/${id}/recommendations`);
      setRec(r.data.current);
      const a = await api.get(`/api/projects/${id}/analytics`);
      setAnalytics(a.data);
    } catch {}
  }

  const avg = mastery.length ? Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length) : 0;
  const doneSteps = [matStatus.includes('ready'), chat.length > 0, questions.length > 0 || (analytics?.attempts || 0) > 0, growth.length > 0];

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('pdf', file);
    setMatStatus('uploading...');
    const { data } = await api.post(`/api/projects/${id}/materials`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const mid = data.material._id;
    setMatStatus('queued...');
    const timer = setInterval(async () => {
      const s = await api.get(`/api/materials/${mid}/status`);
      setMatStatus(s.data.material.status + (s.data.material.error ? ` — ${s.data.material.error}` : ''));
      if (['ready', 'failed'].includes(s.data.material.status)) { clearInterval(timer); refreshStats(); }
    }, 3000);
  }

  async function ask(e) {
    e.preventDefault();
    if (!q.trim() || asking) return;
    const qq = q;
    setQ('');
    setAsking(true);
    setChat((c) => [...c, { role: 'user', text: qq }]);
    try {
      const { data } = await api.post(`/api/projects/${id}/tutor`, { question: qq });
      setChat((c) => [...c, { role: 'assistant', text: data.answer, citations: data.citations, grounded: data.grounded }]);
    } catch (err) {
      setChat((c) => [...c, { role: 'assistant', text: err.response?.data?.error || 'AI unavailable, try again.' }]);
    } finally {
      setAsking(false);
    }
  }

  async function startQuiz() {
    const { data } = await api.post(`/api/projects/${id}/quiz/start`, { count: 4 });
    setQuestions(data.questions.map((x) => ({ ...x, answer: '', result: null })));
  }

  async function answer(x) {
    const { data } = await api.post(`/api/quiz/${x.id}/answer`, { answer: x.answer });
    setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: x.answer, result: data } : y)));
    refreshStats();
  }

  if (!project) return <div className="container"><p className="text-sm">Loading... <Link to="/" className="text-accent hover:underline">Home</Link></p></div>;
  return (
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container">
        <Link to="/" className="text-sm text-text2 hover:underline">← All spaces</Link>
        <div className="page-header fade-up">
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">Goal: {project.goal}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {TABS.map((t, i) => (
              <span key={t.id} className={`badge ${doneSteps[i] ? 'badge-low' : 'badge-info'}`}>
                {doneSteps[i] && <CheckCircle2 size={12} className="mr-1" />}{i + 1}. {t.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid-4 fade-up-2">
          <div className="card"><p className="label">Avg mastery</p><p className="font-heading text-3xl font-extrabold">{avg}%</p></div>
          <div className="card"><p className="label">Concepts</p><p className="font-heading text-3xl font-extrabold">{mastery.length}</p></div>
          <div className="card"><p className="label">Quiz attempts</p><p className="font-heading text-3xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
          <div className="card"><p className="label">Avg score</p><p className="font-heading text-3xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} title={t.hint} className={tab === t.id ? 'btn btn-primary' : 'btn btn-outline'}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-text3">Follow the order: {TABS.map((t) => t.label).join(' → ')}. {TABS.find((t) => t.id === tab)?.hint}.</p>

        {tab === 'materials' && (
          <form onSubmit={upload} className="card fade-up mt-3">
            <h2 className="font-heading text-lg font-bold">Step 1 — Upload learning material</h2>
            <p className="text-sm text-text2">PDF only, 15MB max. Processing runs in background: queued → processing → ready.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
              <button className="btn btn-primary"><UploadCloud size={16} /> Upload & process</button>
            </div>
            <p className="mt-2 text-sm">Status: <span className={`badge ${matStatus.includes('ready') ? 'badge-low' : matStatus.includes('fail') ? 'badge-high' : 'badge-medium'}`}>{matStatus || 'no upload yet'}</span></p>
          </form>
        )}

        {tab === 'tutor' && (
          <div className="card fade-up mt-3">
            <h2 className="font-heading text-lg font-bold">Step 2 — Ask the tutor</h2>
            <p className="text-sm text-text2">Answers come from your PDFs with citations. Off-topic questions are refused.</p>
            <form onSubmit={ask} className="mt-3 flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Explain backpropagation with an example" className="input flex-1" />
              <button className="btn btn-primary" disabled={asking}>{asking ? '…' : 'Ask'}</button>
            </form>
            <div className="mt-3 space-y-2">
              {chat.map((m, i) => (
                <div key={i} className={`rounded-xl p-3 text-sm ${m.role === 'user' ? 'ml-8 bg-surface' : 'mr-8 border border-border bg-bg3'}`}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text3">{m.role}</p>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {(m.citations || []).map((c, j) => (
                    <p key={j} className="mt-1 text-xs font-semibold text-accent">Source: {c.doc} — Page {c.page}</p>
                  ))}
                  {m.grounded === false && <p className="badge badge-medium mt-1">Not grounded — insufficient evidence</p>}
                </div>
              ))}
              {!chat.length && <p className="text-sm text-text3">No questions yet — upload a PDF first, then ask.</p>}
            </div>
          </div>
        )}

        {tab === 'quiz' && (
          <div className="mt-3 space-y-3">
            <div className="card fade-up">
              <h2 className="font-heading text-lg font-bold">Step 3 — Adaptive quiz</h2>
              <p className="text-sm text-text2">Targets weak concepts + mistakes. Alternates multiple-choice and open-ended.</p>
              <button onClick={startQuiz} className="btn btn-primary mt-2"><ListChecks size={16} /> Start quiz (4 questions)</button>
            </div>
            {questions.map((x) => (
              <div key={x.id} className="card">
                <p className="text-sm"><span className="badge badge-info mr-2">{x.concept} · {x.difficulty}</span>{x.stem}</p>
                {x.type === 'mcq' && <div className="mt-1 space-y-0.5 text-sm text-text2">{x.options.map((o) => <p key={o}>• {o}</p>)}</div>}
                <div className="mt-2 flex gap-2">
                  <input value={x.answer} onChange={(e) => setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: e.target.value } : y)))} placeholder="Your answer" className="input flex-1" />
                  <button onClick={() => answer(x)} className="btn btn-outline">Submit</button>
                </div>
                {x.result && <p className="alert alert-info mt-2 !mb-0">Score {x.result.score} — {x.result.feedback?.text}</p>}
              </div>
            ))}
            <div className="card">
              <h3 className="font-heading font-bold">Concept mastery</h3>
              <div className="mt-2 space-y-2">
                {mastery.map((m) => (
                  <div key={m.concept}>
                    <div className="flex justify-between text-sm"><span>{m.concept}</span><span>{m.score}% · {m.mistakes} mistakes</span></div>
                    <div className="h-2 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{ width: `${m.score}%` }} /></div>
                  </div>
                ))}
                {!mastery.length && <p className="text-sm text-text3">Take a quiz to generate mastery.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'growth' && (
          <div className="card fade-up mt-3">
            <h2 className="font-heading text-lg font-bold">Step 4 — Growth & next step</h2>
            <div className="mt-2 space-y-1 text-sm">
              {growth.map((g) => (
                <p key={g.concept}>{g.concept}: {g.score}% <span className={`badge ml-1 ${g.status === 'improving' ? 'badge-low' : g.status === 'needs-attention' ? 'badge-high' : 'badge-medium'}`}>{g.status} Δ{g.delta}</span></p>
              ))}
              {!growth.length && <p className="text-sm text-text3">No growth data yet.</p>}
            </div>
            <h3 className="mt-4 font-heading font-bold">What should you do next?</h3>
            <p className="alert alert-success mt-2">{rec?.text || 'Take a quiz to generate recommendations.'}</p>
            <button onClick={refreshStats} className="btn btn-outline !py-1.5">Refresh stats</button>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="card fade-up mt-3">
            <h2 className="font-heading text-lg font-bold">Project analytics</h2>
            <pre className="mt-2 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-green-200">{JSON.stringify(analytics, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
