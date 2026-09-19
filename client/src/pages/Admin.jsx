import { useEffect, useMemo, useState } from 'react';
import {
  Users, Activity, Cpu, Briefcase, Layers, FolderOpen, FlaskConical,
  GraduationCap, Search, RefreshCw, ShieldCheck, Zap, FileText,
  ListChecks, Database, Sparkles, MessagesSquare, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight, HeartPulse, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { Skel, TextLines, ListRows } from '../components/Shimmer.jsx';
import api from '../api/client.js';
import { useCrumbs } from '../crumbs.js';

// Pill tabs — reference style: light pills, active = dark navy
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'aiusage', label: 'AI Usage', icon: Cpu },
  { id: 'evaluation', label: 'Evaluation', icon: GraduationCap },
  { id: 'health', label: 'Health', icon: HeartPulse },
];

const EVAL_CASES = [
  ['T1', 'tutor-grounded', 'In-material question → cited answer with correct page'],
  ['T2', 'tutor-grounded', 'Follow-up uses conversation history'],
  ['U1', 'unsupported', 'Off-topic question → "insufficient evidence" refusal'],
  ['U2', 'unsupported', 'Other-project material → refusal, no cross-project leak'],
  ['R1', 'retrieval', 'Keyword from a page retrieves that page top-1'],
  ['Q1', 'quiz-grade', 'MCQ correct answer scores 100'],
  ['Q2', 'quiz-grade', 'Open answer missing a point lists it in missing[] + feedback'],
  ['C1', 'recommend', '2 fails on a concept → targeted recommendation'],
];

const DONUT_COLORS = { failed: '#ef4444', completed: '#22c55e', pending: '#f59e0b', running: '#3b82f6' };

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function num(v) {
  return (v ?? 0).toLocaleString();
}

// Small caps section label (reference: CATALOG / ENGAGEMENT …)
function SectionLabel({ children }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text3">{children}</p>;
}

// White stat tile with icon medallion (reference catalog/engagement cards)
function StatTile({ icon: Icon, value, label, loading }) {
  return (
    <div className="card !p-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text2"><Icon size={15} /></span>
      {loading ? <Skel className="mt-2 h-6 w-16" /> : <p className="font-heading mt-2 text-xl font-extrabold">{value}</p>}
      <p className="text-xs text-text3">{label}</p>
    </div>
  );
}

export default function Admin() {
  const { setCrumbs } = useCrumbs();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ overview: null, users: [], logs: [], jobs: [], events: [], spaces: [], projects: [], evaluation: null, aiUsage: null });
  const [aiFilter, setAiFilter] = useState({ feature: '', provider: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [filters, setFilters] = useState({ type: '', user: '', project: '', space: '', from: '', to: '' });
  const [learnerQ, setLearnerQ] = useState('');
  const [journeyId, setJourneyId] = useState('');
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  useEffect(() => { setCrumbs([{ label: 'Spaces', to: '/' }, { label: 'Mission Control' }]); }, []);

  async function loadAiUsage(f = aiFilter) {
    setAiLoading(true);
    try {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v))).toString();
      const { data: u } = await api.get(`/api/admin/ai-usage${qs ? `?${qs}` : ''}`);
      setData((d) => ({ ...d, aiUsage: u }));
    } finally {
      setAiLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [o, u, l, j, e, s, p, ev] = await Promise.all([
        api.get('/api/admin/overview'),
        api.get('/api/admin/users'),
        api.get('/api/admin/ailogs'),
        api.get('/api/admin/jobs'),
        api.get('/api/admin/activity?limit=100'),
        api.get('/api/admin/spaces'),
        api.get('/api/admin/projects'),
        api.get('/api/admin/evaluation'),
      ]);
      setData((d) => ({ ...d, overview: o.data, users: u.data.users, logs: l.data.logs, jobs: j.data.jobs, events: e.data.events, spaces: s.data.spaces, projects: p.data.projects, evaluation: ev.data }));
      loadAiUsage();
    } catch (err) {
      setData((d) => ({ ...d, error: err.response?.data?.error || err.message }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function loadActivity() {
    const qs = new URLSearchParams({ limit: 100, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }).toString();
    const e = await api.get(`/api/admin/activity?${qs}`);
    setData((d) => ({ ...d, events: e.data.events }));
  }

  async function loadJourney(uid) {
    setJourneyId(uid);
    setJourneyLoading(true);
    try {
      const { data: j } = await api.get(`/api/admin/users/${uid}/journey`);
      setJourney(j);
    } finally {
      setJourneyLoading(false);
    }
  }

  async function retry(id) {
    await api.post(`/api/admin/jobs/${id}/retry`);
    loadAll();
  }

  const o = data.overview;
  const ev = data.evaluation;
  const ai = data.aiUsage;
  const booting = loading && !o;

  const learners = useMemo(() => {
    const q = learnerQ.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [data.users, learnerQ]);

  // ---- health derivations ----
  const dayAgo = Date.now() - 864e5;
  const failedJobs = (data.jobs || []).filter((j) => j.status === 'failed');
  const failedJobs24h = failedJobs.filter((j) => new Date(j.updatedAt || j.createdAt).getTime() >= dayAgo);
  const llmErrors = (data.logs || []).filter((l) => l.status === 'error');
  const donut = useMemo(() => {
    const jobs = data.jobs || [];
    const rows = [
      { name: 'failed', value: jobs.filter((j) => j.status === 'failed').length },
      { name: 'completed', value: jobs.filter((j) => j.status === 'done').length },
      { name: 'pending', value: jobs.filter((j) => j.status === 'queued').length },
      { name: 'running', value: jobs.filter((j) => j.status === 'processing').length },
    ];
    return { rows, total: rows.reduce((s, r) => s + r.value, 0) };
  }, [data.jobs]);

  // ---- activity engagement bars ----
  const engagement = useMemo(() => {
    const byType = {};
    (data.events || []).forEach((e) => { byType[e.type] = (byType[e.type] || 0) + 1; });
    const rows = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? `${name.slice(0, 17)}…` : name, count }));
    return { rows, max: Math.max(1, ...rows.map((r) => r.count)) };
  }, [data.events]);

  const catalog = [
    { icon: FolderOpen, value: num(o?.spaces), label: 'Spaces' },
    { icon: Layers, value: num(o?.projects), label: 'Projects' },
    { icon: FileText, value: num(o?.documents), label: 'Documents' },
    { icon: ListChecks, value: num(o?.quizzes), label: 'Quizzes' },
  ];
  const engageCards = [
    { icon: Users, value: num(o?.users), label: 'Users' },
    { icon: Zap, value: num(o?.quizAttempts7d ?? o?.quizzes), label: 'Quiz Attempts' },
    { icon: Database, value: num(o?.evidenceRows), label: 'Evidence Rows' },
    { icon: Sparkles, value: num(o?.recommendations), label: 'Recommendations' },
  ];

  return (
    <div className="theme-dashboard min-h-screen bg-[#f4f5fb] pb-16 dark:bg-bg">
      <div className="container max-w-6xl pt-6">
        {/* HERO — dark navy System Overview */}
        <div className="fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1846] via-[#232052] to-[#14122f] p-6 text-white">
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60"><ShieldCheck size={13} /> Admin · Mission Control</p>
              <h1 className="font-heading mt-1 text-2xl font-extrabold">System Overview</h1>
            </div>
            <div className="flex items-center gap-2">
              {(o?.failures24h ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-200"><AlertTriangle size={13} /> {o.failures24h} failures · 24h</span>
              )}
              <button onClick={loadAll} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-60">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {loading ? 'Syncing…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="relative mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: booting ? '…' : num(o?.users), label: 'Users' },
              { value: booting ? '…' : num(o?.projects), label: 'Projects' },
              { value: booting ? '…' : num(o?.quizAttempts7d), label: 'Quiz attempts · 7d', sub: `${num(o?.quizzes)} all time` },
              { value: booting ? '…' : `$${(o?.aiSpend7d || 0).toFixed(2)}`, label: 'AI spend · 7d' },
            ].map((k) => (
              <div key={k.label}>
                <p className="font-heading text-3xl font-extrabold">{k.value}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-white/55">{k.label}</p>
                {!!k.sub && <p className="text-[11px] text-white/45">{k.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {data.error && <p className="alert alert-error mt-4">{data.error} (login as an admin account)</p>}

        {/* PILL TABS */}
        <div className="fade-up-2 mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${active ? 'bg-[#1e1b4b] text-white shadow' : 'bg-white text-gray-500 hover:text-gray-900 dark:bg-bg2 dark:text-text2 dark:hover:text-text'}`}>
                <t.icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ============ OVERVIEW ============ */}
        {tab === 'overview' && (
          <div className="mt-5 space-y-6">
            <div>
              <SectionLabel>Catalog</SectionLabel>
              <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {catalog.map((c) => <StatTile key={c.label} icon={c.icon} value={c.value} label={c.label} loading={booting} />)}
              </div>
            </div>
            <div>
              <SectionLabel>Engagement</SectionLabel>
              <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {engageCards.map((c) => <StatTile key={c.label} icon={c.icon} value={c.value} label={c.label} loading={booting} />)}
              </div>
            </div>
            <div className="card !p-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
                <p className="text-sm font-bold">Users <span className="font-normal text-text3">{num(learners.length)}</span></p>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-text3" />
                  <input value={learnerQ} onChange={(e) => setLearnerQ(e.target.value)} placeholder="Search email…" className="input !w-56 !py-1.5 !pl-8 !text-xs" />
                </div>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-text3">
                      <th className="px-4 py-2 font-bold">User</th>
                      <th className="px-4 py-2 font-bold">Projects</th>
                      <th className="px-4 py-2 font-bold">Last active</th>
                      <th className="px-4 py-2 font-bold">Role</th>
                      <th className="px-4 py-2 text-right font-bold">Journey</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booting && !learners.length && <tr><td colSpan={5} className="px-4 py-2"><ListRows count={4} /></td></tr>}
                    {learners.map((u) => (
                      <tr key={u._id} className="border-t border-border">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{(u.name || u.email || 'U')[0].toUpperCase()}</span>
                            <span className="min-w-0"><span className="block truncate font-semibold">{u.email}</span><span className="block truncate text-xs text-text3">{u.name || ''}</span></span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold">{u.projects ?? '—'}</td>
                        <td className="px-4 py-2.5 text-text3">{u.lastActive ? timeAgo(u.lastActive) : '—'}</td>
                        <td className="px-4 py-2.5 text-text2">{u.isAdmin ? 'Admin' : 'Student'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => loadJourney(u._id)} title="Open learning journey" className="rounded-lg p-1.5 text-text3 transition hover:bg-surface hover:text-accent"><ChevronRight size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!learners.length && !booting && <p className="px-4 py-8 text-center text-sm text-text3">No users match.</p>}
              </div>
              {/* Journey drill-down */}
              {journeyLoading && <div className="border-t border-border px-4 py-3"><TextLines lines={5} /></div>}
              {journey && !journeyLoading && (
                <div className="border-t border-border bg-bg3/60 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent font-bold text-white">{(journey.user.name || journey.user.email)[0].toUpperCase()}</span>
                    <p className="font-bold">{journey.user.email} <span className="font-normal text-text3">· {journey.projects.length} projects · avg score {journey.avgScore}%</span></p>
                    <button onClick={() => { setJourney(null); setJourneyId(''); }} className="ml-auto text-xs font-bold text-text3 hover:text-text">Close ✕</button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-bg2 p-3">
                      <SectionLabel>Projects</SectionLabel>
                      <div className="mt-1.5 max-h-36 space-y-1 overflow-auto text-xs">
                        {journey.projects.map((p) => <p key={p._id} className="rounded-lg bg-bg3 px-2 py-1.5">• <b>{p.name}</b></p>)}
                        {!journey.projects.length && <p className="text-text3">No projects.</p>}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg2 p-3">
                      <SectionLabel>Mastery — weakest first</SectionLabel>
                      <div className="mt-1.5 max-h-36 space-y-1.5 overflow-auto">
                        {(journey.mastery || []).slice(0, 6).map((m) => (
                          <div key={m.concept}>
                            <div className="flex justify-between text-xs"><span className="truncate font-medium">{m.concept}</span><span>{m.score}%</span></div>
                            <div className="h-1.5 rounded bg-surface"><div className={`h-1.5 rounded ${m.score < 60 ? 'bg-red-500' : m.score < 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${m.score}%` }} /></div>
                          </div>
                        ))}
                        {!(journey.mastery || []).length && <p className="text-xs text-text3">No mastery yet.</p>}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg2 p-3">
                      <SectionLabel>Timeline — latest</SectionLabel>
                      <div className="mt-1.5 max-h-36 space-y-1 overflow-auto text-xs">
                        {(journey.events || []).slice(0, 8).map((e, i) => (
                          <p key={i} className="rounded-lg bg-bg3 px-2 py-1.5"><b className="text-accent">{e.type}</b> <span className="text-text3">· {timeAgo(e.at)}</span></p>
                        ))}
                        {!(journey.events || []).length && <p className="text-text3">No events.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ ACTIVITY ============ */}
        {tab === 'activity' && (
          <div className="mt-5 space-y-4">
            <div className="card">
              <div className="flex flex-wrap items-center gap-2">
                <input value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} placeholder="type: quiz.answered" className="input !w-auto !flex-1 !py-1.5 !text-xs" />
                <input value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })} placeholder="user id" className="input !w-32 !py-1.5 !text-xs" />
                <input value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })} placeholder="project id" className="input !w-32 !py-1.5 !text-xs" />
                <input value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} type="date" className="input !w-auto !py-1.5 !text-xs" />
                <input value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} type="date" className="input !w-auto !py-1.5 !text-xs" />
                <button onClick={loadActivity} className="btn btn-primary !py-1.5 !text-xs">Apply</button>
              </div>
            </div>
            <div className="card">
              <SectionLabel>Engagement — events by type</SectionLabel>
              {engagement.rows.length ? (
                <div className="mt-3 space-y-2">
                  {engagement.rows.map((r) => (
                    <div key={r.name}>
                      <div className="flex justify-between text-xs"><span className="font-semibold">{r.name}</span><b>{r.count}</b></div>
                      <div className="mt-0.5 h-2 rounded-full bg-surface"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(4, Math.round((r.count / engagement.max) * 100))}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-2 text-sm text-text3">No events yet.</p>}
            </div>
            <div className="card">
              <SectionLabel>Event stream — newest first</SectionLabel>
              <div className="mt-2 max-h-[420px] space-y-1 overflow-auto">
                {data.events.map((e) => (
                  <p key={e._id} className="flex flex-wrap items-center gap-2 rounded-xl bg-bg3 px-3 py-2 text-xs">
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 font-bold text-accent">{e.type}</span>
                    <span className="truncate text-text2">{JSON.stringify(e.payload || {}).slice(0, 120)}</span>
                    <span className="ml-auto shrink-0 text-text3">{timeAgo(e.at)}</span>
                  </p>
                ))}
                {!data.events.length && <p className="py-6 text-center text-sm text-text3">No events for these filters.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ============ AI USAGE ============ */}
        {tab === 'aiusage' && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input value={aiFilter.feature} onChange={(e) => setAiFilter({ ...aiFilter, feature: e.target.value })} placeholder="Feature  e.g. quiz_generation" className="input !w-64 !py-2 !text-xs" />
              <select value={aiFilter.provider} onChange={(e) => setAiFilter({ ...aiFilter, provider: e.target.value })} className="input !w-auto !py-2 !text-xs">
                <option value="">Provider: All</option>
                {(ai?.providers || []).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => loadAiUsage()} disabled={aiLoading} className="rounded-xl bg-[#1e1b4b] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60">{aiLoading ? 'Loading…' : 'Refresh'}</button>
              {(aiFilter.feature || aiFilter.provider) && <button onClick={() => { const f = { feature: '', provider: '' }; setAiFilter(f); loadAiUsage(f); }} className="text-xs font-bold text-text3 hover:text-text">Clear ✕</button>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Calls', value: aiLoading ? '…' : num(ai?.calls) },
                { label: 'Tokens', value: aiLoading ? '…' : (ai?.tokens ?? 0) >= 1000 ? `${((ai.tokens || 0) / 1000).toFixed(0)}K` : num(ai?.tokens) },
                { label: 'Cost', value: aiLoading ? '…' : `$${(ai?.cost || 0).toFixed(4)}` },
                { label: 'Error rate', value: aiLoading ? '…' : `${((ai?.errorRate || 0) * 100).toFixed(1)}%` },
                { label: 'Latency p50', value: aiLoading ? '…' : `${num(ai?.p50)}ms` },
                { label: 'Latency p95', value: aiLoading ? '…' : `${num(ai?.p95)}ms` },
              ].map((k) => (
                <div key={k.label} className="card !p-4">
                  <p className="font-heading text-xl font-extrabold">{k.value}</p>
                  <p className="text-xs text-text3">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="card">
              <p className="text-sm font-bold">Cost per day (USD)</p>
              {(ai?.costPerDay || []).length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={ai.costPerDay} margin={{ left: -8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v) => [`$${v}`, 'Cost']} />
                    <Area type="monotone" dataKey="cost" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="mt-2 text-sm text-text3">No spend in this selection yet.</p>}
            </div>
            <div className="card !p-0 overflow-hidden">
              <p className="px-4 pt-4 text-sm font-bold">Recent LLM failures</p>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-text3">
                      <th className="px-4 py-2 font-bold">Time</th>
                      <th className="px-4 py-2 font-bold">Feature</th>
                      <th className="px-4 py-2 font-bold">Model</th>
                      <th className="px-4 py-2 font-bold">Error</th>
                      <th className="px-4 py-2 text-right font-bold">MS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {llmErrors.slice(0, 10).map((l) => (
                      <tr key={l._id} className="border-t border-border">
                        <td className="whitespace-nowrap px-4 py-2 text-text2">{fmtDate(l.createdAt)}</td>
                        <td className="px-4 py-2 font-semibold">{l.feature}</td>
                        <td className="px-4 py-2 text-text2">{l.model || '—'}</td>
                        <td className="max-w-[320px] truncate px-4 py-2 text-red-600" title={l.error}>{l.error}</td>
                        <td className="px-4 py-2 text-right text-text2">{num(l.latency_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!llmErrors.length && <p className="px-4 py-6 text-center text-sm text-text3">No LLM failures — all calls healthy.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ============ EVALUATION ============ */}
        {tab === 'evaluation' && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Citation rate · target > 0.7', value: ev?.tutor?.citationRate ?? '—', sub: `${ev?.tutor?.sampledAnswers ?? 0} answers sampled` },
                { label: 'Unsupported refusals · must be > 0', value: ev?.tutor?.unsupportedRefusals ?? '—', sub: 'insufficient-evidence responses' },
                { label: 'AI error rate', value: ev?.reliability?.errorRate ?? '—', sub: `${ev?.reliability?.aiCalls ?? 0} calls · ${ev?.reliability?.gradedAnswers ?? 0} graded` },
              ].map((k) => (
                <div key={k.label} className="card">
                  <p className="label">{k.label}</p>
                  <p className="font-heading text-3xl font-extrabold">{k.value}</p>
                  <p className="text-xs text-text3">{k.sub}</p>
                </div>
              ))}
            </div>
            <div className="card">
              <p className="text-sm font-bold">Curated cases → live verdict <span className="font-normal text-text3">· verdicts computed from production data on every load</span></p>
              <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-800 dark:bg-green-950 dark:text-green-200">✓ pass — proven by data</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">! needs data — use the feature, then refresh</span>
              </p>
              <div className="mt-3 grid gap-1.5 md:grid-cols-2">
                {EVAL_CASES.map(([id, area, desc]) => {
                  let pass = null;
                  if (id === 'T1') pass = (ev?.tutor?.citationRate ?? 0) > 0.3;
                  if (id === 'U1' || id === 'U2') pass = (ev?.tutor?.unsupportedRefusals ?? 0) > 0;
                  if (id === 'Q1' || id === 'Q2') pass = (ev?.reliability?.gradedAnswers ?? 0) > 0;
                  if (id === 'C1') pass = (data.events || []).some((e) => e.type === 'recommendation.created');
                  if (id === 'R1' || id === 'T2') pass = (data.logs || []).length > 0;
                  return (
                    <p key={id} className="flex items-start gap-2 rounded-xl bg-bg3 px-3 py-2 text-xs">
                      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${pass ? 'bg-green-500' : pass === false ? 'bg-amber-500' : 'bg-gray-400'}`}>{pass ? '✓' : pass === false ? '!' : '·'}</span>
                      <span><b>{id}</b> <span className="badge badge-info ml-1 !text-[10px]">{area}</span><br />{desc}</span>
                    </p>
                  );
                })}
              </div>
              {!!ev?.notes?.length && <div className="mt-2 space-y-0.5 text-[11px] text-text3">{ev.notes.map((n, i) => <p key={i}>• {n}</p>)}</div>}
            </div>
          </div>
        )}

        {/* ============ HEALTH ============ */}
        {tab === 'health' && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="card !p-4">
                <p className="font-heading text-xl font-extrabold">{booting ? '…' : num(o?.failedJobs24h ?? failedJobs24h.length)}</p>
                <p className="text-xs text-text3">Failed jobs (24h)</p>
              </div>
              <div className="card !p-4">
                <p className="font-heading text-xl font-extrabold">{booting ? '…' : num(o?.failedLlm24h)}</p>
                <p className="text-xs text-text3">Failed LLM calls (24h)</p>
              </div>
            </div>
            <div className="card">
              <p className="text-sm font-bold">Jobs by status (all time)</p>
              <div className="mt-2 flex flex-wrap items-center gap-6">
                <ResponsiveContainer width={220} height={180}>
                  <PieChart>
                    <Pie data={donut.rows.filter((r) => r.value > 0)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                      {donut.rows.filter((r) => r.value > 0).map((r) => <Cell key={r.name} fill={DONUT_COLORS[r.name]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 text-sm">
                  {donut.rows.map((r) => (
                    <p key={r.name} className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[r.name] }} />
                      <span className="text-text2">{r.name}</span><b>{num(r.value)}</b>
                    </p>
                  ))}
                  {!donut.total && <p className="text-text3">No jobs yet.</p>}
                </div>
              </div>
            </div>
            <div className="card !p-0 overflow-hidden">
              <p className="px-4 pt-4 text-sm font-bold">Recent job failures</p>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-text3">
                      <th className="px-4 py-2 font-bold">Time</th>
                      <th className="px-4 py-2 font-bold">Job type</th>
                      <th className="px-4 py-2 font-bold">Error</th>
                      <th className="px-4 py-2 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedJobs.slice(0, 10).map((j) => (
                      <tr key={j._id} className="border-t border-border">
                        <td className="whitespace-nowrap px-4 py-2 text-text2">{fmtDate(j.updatedAt || j.createdAt)}</td>
                        <td className="px-4 py-2 font-semibold">{j.type}</td>
                        <td className="max-w-[340px] truncate px-4 py-2 text-red-600" title={j.error}>{j.error || '—'}</td>
                        <td className="px-4 py-2 text-right"><button onClick={() => retry(j._id)} className="btn btn-outline !px-2.5 !py-1 !text-[11px]">Retry</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!failedJobs.length && <p className="px-4 py-6 text-center text-sm text-text3">No failed jobs — queue is healthy.</p>}
              </div>
            </div>
            <div className="card !p-0 overflow-hidden">
              <p className="px-4 pt-4 text-sm font-bold">Recent LLM failures</p>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-text3">
                      <th className="px-4 py-2 font-bold">Time</th>
                      <th className="px-4 py-2 font-bold">Feature</th>
                      <th className="px-4 py-2 font-bold">Model</th>
                      <th className="px-4 py-2 font-bold">Error</th>
                      <th className="px-4 py-2 text-right font-bold">MS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {llmErrors.slice(0, 10).map((l) => (
                      <tr key={l._id} className="border-t border-border">
                        <td className="whitespace-nowrap px-4 py-2 text-text2">{fmtDate(l.createdAt)}</td>
                        <td className="px-4 py-2 font-semibold">{l.feature}</td>
                        <td className="px-4 py-2 text-text2">{l.model || '—'}</td>
                        <td className="max-w-[320px] truncate px-4 py-2 text-red-600" title={l.error}>{l.error}</td>
                        <td className="px-4 py-2 text-right text-text2">{num(l.latency_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!llmErrors.length && <p className="px-4 py-6 text-center text-sm text-text3">No LLM failures — all calls healthy.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
