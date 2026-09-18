import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { UploadCloud, MessagesSquare, ListChecks, TrendingUp, BarChart3, CheckCircle2, Circle, Bot, User as UserIcon, Send, Sparkles, BookOpen, Folder, Target, FileText, Trash2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import api from '../api/client.js';
import { useCrumbs } from '../crumbs.js';

const SUGGESTIONS = ['Summarize my document', 'Explain simply with an example', 'Give key definitions', 'What should I revise?'];

const STEPS = [
  { id: 'materials', n: 1, label: 'Materials', icon: UploadCloud, hint: 'Upload PDF first' },
  { id: 'tutor', n: 2, label: 'Tutor', icon: MessagesSquare, hint: 'Ask, get cited answers' },
  { id: 'quiz', n: 3, label: 'Quiz', icon: ListChecks, hint: 'MCQ + open-ended' },
  { id: 'growth', n: 4, label: 'Growth', icon: TrendingUp, hint: 'Mastery + next step' },
  { id: 'analytics', n: 5, label: 'Analytics', icon: BarChart3, hint: 'Activity + scores' },
];

// Sidebar nav like Screenshot 197: AI Tutor / Materials / Concepts / Quiz / Assignments / Analytics
const SIDEBAR_NAV = [
  { id: 'tutor', label: 'AI Tutor', icon: MessagesSquare, badge: 'AI' },
  { id: 'materials', label: 'Materials', icon: Folder },
  { id: 'concepts', label: 'Concepts', icon: BookOpen },
  { id: 'quiz', label: 'Quiz', icon: Target },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const TAB_LABEL = {
  overview: 'Overview',
  tutor: 'AI Tutor',
  materials: 'Materials',
  concepts: 'Concepts',
  quiz: 'Quiz',
  assignments: 'Assignments',
  growth: 'Growth',
  analytics: 'Analytics',
};

function initial(name) {
  return (name || 'M').trim().charAt(0).toUpperCase();
}

export default function Project() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const { setCrumbs } = useCrumbs();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [file, setFile] = useState(null);
  const [matStatus, setMatStatus] = useState('');
  const [q, setQ] = useState('');
  const [chat, setChat] = useState([]);
  const [asking, setAsking] = useState(false);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat, asking, tab]);
  const [questions, setQuestions] = useState([]);
  const [mastery, setMastery] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [rec, setRec] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  async function loadMaterials() {
    try {
      const { data } = await api.get(`/api/projects/${id}/materials`);
      setMaterials(data.materials || []);
    } catch {}
  }

  useEffect(() => {
    if (tab === 'materials') loadMaterials();
  }, [tab]);

  async function deleteMaterial(mid, name) {
    if (!window.confirm(`Delete "${name}"? Its chunks and jobs go too. This cannot be undone.`)) return;
    setDeletingId(mid);
    try {
      await api.delete(`/api/materials/${mid}`);
      await loadMaterials();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed — try again');
    } finally {
      setDeletingId(null);
    }
  }

  // Tab switches go through the URL so the global sidebar stays in sync
  const goTab = (t) => {
    setTab(t);
    setSearchParams(t === 'overview' ? {} : { tab: t });
  };

  useEffect(() => {
    localStorage.setItem('lastProjectId', id);
    const t = searchParams.get('tab');
    if (t) setTab(t);
    api.get(`/api/projects/${id}`).then((r) => {
      const p = r.data.project;
      setProject(p);
      const sp = p.space && typeof p.space === 'object' ? p.space : { _id: p.space };
      localStorage.setItem('lastProject', JSON.stringify({ id: p._id, name: p.name, spaceId: sp._id || null, spaceName: sp.name || '' }));
      localStorage.setItem('lastSpace', JSON.stringify({ id: sp._id || null, name: sp.name || '' }));
    }).catch(() => {});
    api.get(`/api/projects/${id}/tutor/history`).then((r) => setChat(r.data.messages || [])).catch(() => {});
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

  useEffect(() => {
    if (!project) return;
    const sp = project.space && typeof project.space === 'object' ? project.space : {};
    setCrumbs([
      { label: 'Spaces', to: '/' },
      ...(sp._id ? [{ label: sp.name || 'Space', to: `/?space=${sp._id}` }] : []),
      { label: project.name },
      { label: TAB_LABEL[tab] || tab },
    ]);
  }, [project, tab]);

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
    concepts: mastery.length > 0,
    quiz: questions.length > 0 || (analytics?.attempts || 0) > 0,
    assignments: (analytics?.recentAttempts || []).length > 0,
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
      if (['ready', 'failed'].includes(s.data.material.status)) { clearInterval(timer); refreshStats(); loadMaterials(); }
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
    <div className="flex min-h-screen bg-[#eef1f8]">
      {/* In-page nav — mobile only (global sidebar rules on desktop) */}
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-white lg:hidden">
        <Link to="/" className="flex items-center gap-1 px-4 pt-4 text-sm font-medium text-text2 hover:text-text">
          <span aria-hidden>←</span> Back
        </Link>

        <button onClick={() => goTab('overview')} title="Go to overview" className="mx-3 mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-[#f4f6fb]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4f46e5] text-sm font-bold text-white">
            {initial(project.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text">{project.name}</span>
            <span className="block truncate text-xs text-text3">{project.goal?.slice(0, 28) || 'project'}</span>
          </span>
        </button>

        <nav className="mt-2 space-y-0.5 px-3 pb-4">
          {SIDEBAR_NAV.map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => goTab(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active ? 'bg-[#ede9fe] font-semibold text-[#4f46e5]' : 'font-medium text-text2 hover:bg-[#f4f6fb] hover:text-text'
                }`}
              >
                <Icon size={17} className={active ? 'text-[#4f46e5]' : 'text-text3'} />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="text-[11px] font-bold text-[#6d64e8]">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text3">Avg mastery</p>
          <p className="font-heading text-2xl font-extrabold text-text">{avg}%</p>
          <div className="mt-1 h-2 rounded bg-[#eef1f8]"><div className="h-2 rounded bg-[#4f46e5]" style={{ width: `${avg}%` }} /></div>
          <p className="mt-2 text-[11px] text-text3">Space → Project → Material → Tutor → Quiz → Mastery</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1 px-4 py-4 lg:px-7">
        <p className="flex items-center gap-1.5 text-[13px] text-text3">
          <Link to="/" className="hover:text-text hover:underline">Projects</Link>
          <span>/</span>
          <button onClick={() => goTab('overview')} className="hover:text-text hover:underline">{project.name}</button>
          <span>/</span>
          <span className="font-semibold text-text">{TAB_LABEL[tab] || tab}</span>
        </p>

        <div className="mt-3">
          {tab === 'overview' && (
          <div className="grid-4 fade-up-2">
            <div className="card"><p className="label">Concepts</p><p className="font-heading text-3xl font-extrabold">{mastery.length}</p></div>
            <div className="card"><p className="label">Quiz attempts</p><p className="font-heading text-3xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
            <div className="card"><p className="label">Avg score</p><p className="font-heading text-3xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
            <div className="card"><p className="label">Current section</p><p className="font-heading text-lg font-bold">{TAB_LABEL[tab] || tab}</p></div>
          </div>
          )}

          {tab === 'overview' && (
            <div className="mt-4 space-y-4">
              <div className="card fade-up">
                <h2 className="font-heading text-lg font-bold">Where you stand</h2>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <div><p className="label">Avg mastery</p><p className="font-heading text-2xl font-extrabold">{avg}%</p></div>
                  <div><p className="label">Quiz attempts</p><p className="font-heading text-2xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
                  <div><p className="label">Avg score</p><p className="font-heading text-2xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Learning path</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STEPS.map((s) => (
                    <button key={s.id} onClick={() => goTab(s.id)} className="btn btn-outline !py-1.5 !text-xs">{s.label}</button>
                  ))}
                  <button onClick={() => goTab('concepts')} className="btn btn-outline !py-1.5 !text-xs">Concepts</button>
                  <button onClick={() => goTab('assignments')} className="btn btn-outline !py-1.5 !text-xs">Assignments</button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="card">
                  <h3 className="font-heading font-bold">Important concepts</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    {mastery.slice().sort((a, b) => a.score - b.score).slice(0, 3).map((m) => (
                      <p key={m.concept}>{m.concept}: <b>{m.score}%</b></p>
                    ))}
                    {!mastery.length && <p className="text-sm text-text3">No concepts yet — upload material.</p>}
                  </div>
                  <button onClick={() => goTab('quiz')} className="btn btn-outline mt-2 !py-1.5 !text-xs">Practice → Quiz</button>
                </div>
                <div className="card">
                  <h3 className="font-heading font-bold">Recent activity</h3>
                  <div className="mt-2 space-y-1 text-xs text-text2">
                    {(analytics?.events || []).slice(0, 5).map((e, i) => (
                      <p key={i}><b>{e.type}</b> · {new Date(e.at || e.createdAt).toLocaleString()}</p>
                    ))}
                    {!(analytics?.events || []).length && <p className="text-sm text-text3">Nothing yet.</p>}
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Recommended next step</h3>
                <p className="alert alert-success mt-2">{rec?.text || 'Upload material, then ask the Tutor.'}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => goTab('materials')} className="btn btn-outline !py-1.5 !text-xs">Materials</button>
                  <button onClick={() => goTab('tutor')} className="btn btn-outline !py-1.5 !text-xs">Tutor</button>
                  <button onClick={() => goTab('quiz')} className="btn btn-primary !py-1.5 !text-xs">Quiz</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'materials' && (
            <form onSubmit={upload} className="card fade-up mt-4">
              <h2 className="font-heading text-lg font-bold">Step 1 — Upload learning material</h2>
              <p className="text-sm text-text2">PDF only, 15MB max. Background: queued → processing → ready. Next: ask the Tutor.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
                <button className="btn btn-primary"><UploadCloud size={16} /> Upload & process</button>
              </div>
              <p className="mt-2 text-sm">Status: <span className={`badge ${matStatus.includes('ready') ? 'badge-low' : matStatus.includes('fail') ? 'badge-high' : 'badge-medium'}`}>{matStatus || 'no upload yet'}</span></p>
              <div className="mt-4">
                <h3 className="font-heading font-bold">Documents in this project</h3>
                <div className="mt-2 space-y-2">
                  {materials.map((m) => (
                    <div key={m._id} className="flex items-center gap-3 rounded-xl border border-border bg-bg3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.filename}</span>
                        <span className="text-xs text-text3">{m.pages || '?'} pages · {new Date(m.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className={`badge ${m.status === 'ready' ? 'badge-low' : m.status === 'failed' ? 'badge-high' : 'badge-medium'}`}>{m.status}</span>
                      <button onClick={() => deleteMaterial(m._id, m.filename)} disabled={deletingId === m._id} title={`Delete ${m.filename}`} className="rounded-lg p-1.5 text-text3 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                        {deletingId === m._id ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border2 border-t-red-600" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  ))}
                  {!materials.length && <p className="text-sm text-text3">No documents yet.</p>}
                </div>
              </div>
            </form>
          )}

          {tab === 'concepts' && (
            <div className="card fade-up mt-4">
              <h2 className="font-heading text-lg font-bold">Concepts</h2>
              <p className="text-sm text-text2">Key ideas extracted from your materials, with mastery scores. Weak concepts feed the Quiz.</p>
              <div className="mt-3 space-y-2">
                {mastery.map((m) => (
                  <div key={m.concept}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{m.concept}</span><span>{m.score}% · {m.mistakes} mistakes</span></div>
                    <div className="h-2 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{ width: `${m.score}%` }} /></div>
                  </div>
                ))}
                {!mastery.length && <p className="text-sm text-text3">No concepts yet — upload a PDF, then take a quiz.</p>}
              </div>
              <button onClick={() => goTab('quiz')} className="btn btn-primary mt-3 !py-1.5 !text-xs">Practice weak concepts →</button>
            </div>
          )}

          {tab === 'tutor' && (
            <div className="card fade-up mt-4 flex h-[calc(100vh-230px)] min-h-[480px] !p-0 overflow-hidden flex-col">
              <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg3 px-4 py-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white"><Bot size={17} /></span>
                <div>
                  <p className="text-sm font-bold">AI Tutor</p>
                  <p className="text-xs text-text3">Grounded in your PDFs · cites doc + page · refuses off-topic</p>
                </div>
              </div>
              <div ref={chatBoxRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-bg px-4 py-4">
                {!chat.length && !asking && (
                  <div className="mx-auto mt-10 max-w-sm text-center">
                    <Sparkles size={28} className="mx-auto text-accent" />
                    <p className="mt-2 font-heading font-bold">Ask anything from your material</p>
                    <p className="text-sm text-text3">Upload a PDF in Materials first, then try a suggestion below.</p>
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
              <div className="shrink-0 border-t border-border bg-bg2 px-4 py-3">
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
                <h2 className="font-heading text-lg font-bold">Adaptive quiz</h2>
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

          {tab === 'assignments' && (
            <div className="mt-4 space-y-3">
              <div className="card fade-up">
                <h2 className="font-heading text-lg font-bold">Assignments</h2>
                <p className="text-sm text-text2">Your recent quiz attempts as assignments. Submit new ones from the Quiz tab.</p>
                <button onClick={() => goTab('quiz')} className="btn btn-primary mt-2 !py-1.5 !text-xs">Go to Quiz →</button>
              </div>
              {(analytics?.recentAttempts || []).map((a, i) => (
                <div key={i} className="card">
                  <p className="text-sm font-semibold">Attempt #{(analytics.recentAttempts.length - i)} — Score {a.score}%</p>
                  <p className="text-xs text-text3">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p>
                </div>
              ))}
              {!(analytics?.recentAttempts || []).length && <div className="card text-sm text-text3">No assignments yet — start a quiz.</div>}
            </div>
          )}

          {tab === 'growth' && (
            <div className="card fade-up mt-4">
              <h2 className="font-heading text-lg font-bold">Growth & next step</h2>
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

          {/* Sidebar step checklist (kept compact) */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-text3">
            {STEPS.map((s) => (
              <button key={s.id} onClick={() => goTab(s.id)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 hover:border-accent hover:text-accent">
                {done[s.id] ? <CheckCircle2 size={11} className="text-green-600" /> : <Circle size={11} />}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
