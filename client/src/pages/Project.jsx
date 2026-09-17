import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { UploadCloud, MessagesSquare, ListChecks, TrendingUp, BarChart3, CheckCircle2, Circle, Bot, User as UserIcon, Send, Sparkles, BookOpen } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import api from '../api/client.js';

const SUGGESTIONS = ['Summarize my document', 'Explain simply with an example', 'Give key definitions', 'What should I revise?'];

const STEPS = [
  { id: 'materials', n: 1, label: 'Materials', icon: UploadCloud, hint: 'Upload PDF first' },
  { id: 'tutor', n: 2, label: 'Tutor', icon: MessagesSquare, hint: 'Ask, get cited answers' },
  { id: 'quiz', n: 3, label: 'Quiz', icon: ListChecks, hint: 'MCQ + open-ended' },
  { id: 'growth', n: 4, label: 'Growth', icon: TrendingUp, hint: 'Mastery + next step' },
  { id: 'analytics', n: 5, label: 'Analytics', icon: BarChart3, hint: 'Activity + scores' },
];

export default function Project() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState(searchParams.get('tab') || 'materials');
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
    localStorage.setItem('lastProjectId', id);
    const t = searchParams.get('tab');
    if (t) setTab(t);
    api.get(`/api/projects/${id}`).then((r) => setProject(r.data.project)).catch(() => {});
    api.get(`/api/projects/${id}/tutor/history`).then((r) => setChat(r.data.messages || [])).catch(() => {});
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

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
  const done = {
    materials: matStatus.includes('ready'),
    tutor: chat.length > 0,
    quiz: questions.length > 0 || (analytics?.attempts || 0) > 0,
    growth: growth.length > 0,
    analytics: !!analytics,
  };

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
    e?.preventDefault();
    await sendText(q);
  }

  async function sendText(text) {
    if (!text.trim() || asking) return;
    const qq = text;
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
        <div className="page-header fade-up !pb-4">
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">Goal: {project.goal}</p>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Sidebar — step by step */}
          <aside className="w-full shrink-0 lg:w-64">
            <div className="card !p-3 lg:sticky lg:top-20">
              <p className="label !mb-2 px-2">Learning path</p>
              <nav className="flex gap-2 overflow-x-auto lg:flex-col">
                {STEPS.map((s) => {
                  const active = tab === s.id;
                  const isDone = done[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setTab(s.id)}
                      className={`flex min-w-[180px] items-start gap-3 rounded-xl border p-3 text-left transition lg:min-w-0 ${
                        active ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-surface'
                      }`}
                    >
                      <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDone ? 'bg-green-500 text-white' : active ? 'bg-accent text-white' : 'bg-surface text-text2'}`}>
                        {isDone ? <CheckCircle2 size={14} /> : s.n}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{s.label}</span>
                        <span className="block text-xs text-text3">{s.hint}</span>
                        <span className={`mt-1 inline-flex items-center gap-1 text-[11px] ${isDone ? 'text-green-600' : 'text-text3'}`}>
                          {isDone ? <><CheckCircle2 size={11} /> done</> : <><Circle size={11} /> step {s.n} of 5</>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="mt-3 border-t border-border px-2 pt-3">
                <p className="label">Avg mastery</p>
                <p className="font-heading text-2xl font-extrabold">{avg}%</p>
                <div className="mt-1 h-2 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{ width: `${avg}%` }} /></div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <div className="grid-4 fade-up-2">
              <div className="card"><p className="label">Concepts</p><p className="font-heading text-3xl font-extrabold">{mastery.length}</p></div>
              <div className="card"><p className="label">Quiz attempts</p><p className="font-heading text-3xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
              <div className="card"><p className="label">Avg score</p><p className="font-heading text-3xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
              <div className="card"><p className="label">Current step</p><p className="font-heading text-lg font-bold">{STEPS.find((s) => s.id === tab)?.label}</p></div>
            </div>

            {tab === 'materials' && (
              <form onSubmit={upload} className="card fade-up mt-4">
                <h2 className="font-heading text-lg font-bold">Step 1 — Upload learning material</h2>
                <p className="text-sm text-text2">PDF only, 15MB max. Background: queued → processing → ready. Next: ask the Tutor.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
                  <button className="btn btn-primary"><UploadCloud size={16} /> Upload & process</button>
                </div>
                <p className="mt-2 text-sm">Status: <span className={`badge ${matStatus.includes('ready') ? 'badge-low' : matStatus.includes('fail') ? 'badge-high' : 'badge-medium'}`}>{matStatus || 'no upload yet'}</span></p>
              </form>
            )}

            {tab === 'tutor' && (
              <div className="card fade-up mt-4 !p-0 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-bg3 px-4 py-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white"><Bot size={17} /></span>
                  <div>
                    <p className="text-sm font-bold">AI Tutor</p>
                    <p className="text-xs text-text3">Grounded in your PDFs · cites doc + page · refuses off-topic</p>
                  </div>
                </div>
                <div className="space-y-3 bg-bg px-4 py-4">
                  {!chat.length && !asking && (
                    <div className="mx-auto mt-10 max-w-sm text-center">
                      <Sparkles size={28} className="mx-auto text-accent" />
                      <p className="mt-2 font-heading font-bold">Ask anything from your material</p>
                      <p className="text-sm text-text3">Upload a PDF in Step 1 first, then try a suggestion below.</p>
                    </div>
                  )}
                  {chat.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role !== 'user' && (
                        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Bot size={14} /></span>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'rounded-br-sm bg-accent text-white' : 'rounded-bl-sm border border-border bg-bg2'}`}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        {(m.citations || []).map((c, j) => (
                          <p key={j} className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent"><BookOpen size={11} /> {c.doc} · p.{c.page}</p>
                        ))}
                        {m.grounded === false && <p className="badge badge-medium mt-1.5">Not grounded — insufficient evidence</p>}
                      </div>
                      {m.role === 'user' && (
                        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-text2"><UserIcon size={14} /></span>
                      )}
                    </div>
                  ))}
                  {asking && (
                    <div className="flex gap-2">
                      <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white"><Bot size={14} /></span>
                      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-bg2 px-4 py-3">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-text3" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-text3 [animation-delay:0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-text3 [animation-delay:0.3s]" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="sticky bottom-0 border-t border-border bg-bg2 px-4 py-3">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => sendText(s)} disabled={asking} className="rounded-full border border-border bg-bg3 px-2.5 py-1 text-xs text-text2 hover:border-accent hover:text-accent disabled:opacity-50">{s}</button>
                    ))}
                  </div>
                  <form onSubmit={ask} className="flex gap-2">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your question… (Enter to send)" className="input flex-1" />
                    <button className="btn btn-primary !px-4" disabled={asking}><Send size={16} /></button>
                  </form>
                </div>
              </div>
            )}

            {tab === 'quiz' && (
              <div className="mt-4 space-y-3">
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
              <div className="card fade-up mt-4">
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
              <div className="mt-4 space-y-4">
                <div className="grid-4 fade-up">
                  <div className="card"><p className="label">Attempts</p><p className="font-heading text-3xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
                  <div className="card"><p className="label">Avg score</p><p className="font-heading text-3xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
                  <div className="card"><p className="label">Concepts tracked</p><p className="font-heading text-3xl font-extrabold">{mastery.length}</p></div>
                  <div className="card"><p className="label">Events logged</p><p className="font-heading text-3xl font-extrabold">{analytics?.events?.length ?? 0}</p></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card fade-up">
                    <h3 className="font-heading font-bold">Mastery by concept</h3>
                    {mastery.length ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={mastery.map((m) => ({ name: m.concept.slice(0, 12), score: m.score }))}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} dy={8} height={50} />
                          <YAxis domain={[0, 100]} fontSize={11} />
                          <Tooltip />
                          <Bar dataKey="score" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-text3">Take a quiz to see mastery bars.</p>}
                  </div>
                  <div className="card fade-up">
                    <h3 className="font-heading font-bold">Score trend (recent attempts)</h3>
                    {(analytics?.recentAttempts || []).length ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={analytics.recentAttempts.map((a, i) => ({ n: i + 1, score: a.score }))}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="n" fontSize={11} label={{ value: 'attempt', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                          <YAxis domain={[0, 100]} fontSize={11} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-text3">No attempts yet — trend appears after quizzes.</p>}
                  </div>
                </div>
                <div className="card">
                  <h3 className="font-heading font-bold">Recent activity</h3>
                  <div className="mt-2 max-h-56 space-y-1 overflow-auto text-xs text-text2">
                    {(analytics?.events || []).slice(0, 15).map((e, i) => (
                      <p key={i} className="rounded-lg bg-bg3 px-2 py-1.5"><b>{e.type}</b> · {new Date(e.at || e.createdAt).toLocaleString()} · {JSON.stringify(e.payload || {}).slice(0, 100)}</p>
                    ))}
                    {!(analytics?.events || []).length && <p className="text-sm text-text3">No activity logged yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
