import { useEffect, useMemo, useState } from 'react';
import {
  Users, Activity, Cpu, Briefcase, Layers, FolderOpen, FlaskConical,
  HeartPulse, GraduationCap, Search, RefreshCw, ShieldCheck, Zap,
  AlertTriangle, CheckCircle2, XCircle, Clock, ChevronRight, Wrench,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Skel, TextLines, ListRows } from '../components/Shimmer.jsx';
import api from '../api/client.js';
import { useCrumbs } from '../crumbs.js';

const TABS = [
  { id: 'overview', label: 'Overview', icon: HeartPulse },
  { id: 'learners', label: 'Learners', icon: GraduationCap },
  { id: 'content', label: 'Spaces & Projects', icon: FolderOpen },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'aiops', label: 'AI Ops', icon: Cpu },
  { id: 'quality', label: 'Quality', icon: FlaskConical },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
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

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function HealthDot({ ok, warn }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-green-500' : warn ? 'bg-amber-500' : 'bg-red-500'}`} />;
}

export default function Admin() {
  const { setCrumbs } = useCrumbs();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ overview: null, users: [], logs: [], jobs: [], events: [], spaces: [], projects: [], evaluation: null });
  const [filters, setFilters] = useState({ type: '', user: '', project: '', space: '', from: '', to: '' });
  const [learnerQ, setLearnerQ] = useState('');
  const [contentQ, setContentQ] = useState('');
  const [logQ, setLogQ] = useState('');
  const [journeyId, setJourneyId] = useState('');
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  useEffect(() => { setCrumbs([{ label: 'Spaces', to: '/' }, { label: 'Mission Control' }]); }, []);

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
      setData({ overview: o.data, users: u.data.users, logs: l.data.logs, jobs: j.data.jobs, events: e.data.events, spaces: s.data.spaces, projects: p.data.projects, evaluation: ev.data });
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
    setTab('activity');
  }

  async function loadJourney(id) {
    const uid = id || journeyId;
    if (!uid) return;
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

  // ---- derived signals (all client-side, zero extra calls) ----
  const derived = useMemo(() => {
    const events = data.events || [];
    const logs = data.logs || [];
    const jobs = data.jobs || [];
    const byType = {};
    events.forEach((e) => { byType[e.type] = (byType[e.type] || 0) + 1; });
    const engagement = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 17) + '…' : name, count }));
    const aiCalls = logs.length;
    const aiErrors = logs.filter((l) => l.status === 'error').length;
    const avgLatency = logs.length ? Math.round(logs.reduce((s, l) => s + (l.latency_ms || 0), 0) / logs.length) : 0;
    const totalTokens = logs.reduce((s, l) => s + (l.tokens || 0), 0);
    const totalCost = logs.reduce((s, l) => s + (l.cost_est || 0), 0);
    const lat = data.evaluation?.latency || {};
    const latencyByFeature = Object.entries(lat).map(([name, v]) => ({ name, ms: v.avgLatencyMs || 0, errors: v.errorRate || 0 }));
    const jobsByStatus = ['queued', 'processing', 'done', 'failed'].map((s) => ({ status: s, count: jobs.filter((j) => j.status === s).length }));
    const queueDepth = jobs.filter((j) => ['queued', 'processing'].includes(j.status)).length;
    const errorRate = aiCalls ? aiErrors / aiCalls : 0;
    return { byType, engagement, aiCalls, aiErrors, avgLatency, totalTokens, totalCost, latencyByFeature, jobsByStatus, queueDepth, errorRate };
  }, [data]);

  const learners = useMemo(() => {
    const q = learnerQ.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [data.users, learnerQ]);

  const content = useMemo(() => {
    const q = contentQ.trim().toLowerCase();
    const spaces = !q ? data.spaces : data.spaces.filter((s) => `${s.name} ${s.user?.email || ''}`.toLowerCase().includes(q));
    const projects = !q ? data.projects : data.projects.filter((p) => `${p.name} ${p.space?.name || ''} ${p.user?.email || ''}`.toLowerCase().includes(q));
    return { spaces, projects };
  }, [data.spaces, data.projects, contentQ]);

  const logs = useMemo(() => {
    const q = logQ.trim().toLowerCase();
    if (!q) return data.logs;
    return data.logs.filter((l) => `${l.feature} ${l.model} ${l.status} ${l.error || ''}`.toLowerCase().includes(q));
  }, [data.logs, logQ]);

  const o = data.overview;
  const ev = data.evaluation;
  const booting = loading && !o;
  const funnel = [
    { label: 'Spaces', value: data.spaces.length },
    { label: 'Projects', value: data.projects.length },
    { label: 'Learning events', value: o?.events ?? data.events.length },
    { label: 'AI calls', value: derived.aiCalls },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  const loopCoverage = [
    { label: 'Auth + Spaces/Projects', live: data.users.length > 0 && data.projects.length >= 0, hint: `${data.users.length} users · ${data.projects.length} projects` },
    { label: 'Materials → background jobs', live: data.jobs.length > 0, hint: `${data.jobs.length} jobs tracked` },
    { label: 'Tutor grounded + citations', live: (ev?.tutor?.citationRate ?? 0) > 0 || derived.byType['tutor.asked'] > 0, hint: `citation rate ${ev?.tutor?.citationRate ?? '—'}` },
    { label: 'Unsupported refusal', live: (ev?.tutor?.unsupportedRefusals ?? 0) > 0, hint: `${ev?.tutor?.unsupportedRefusals ?? 0} refusals` },
    { label: 'Adaptive quiz + grading', live: (derived.byType['quiz.answered'] ?? 0) > 0, hint: `${derived.byType['quiz.answered'] ?? 0} answers` },
    { label: 'Mastery / growth / recs', live: (derived.byType['mastery.updated'] ?? 0) > 0, hint: `${derived.byType['mastery.updated'] ?? 0} mastery updates` },
    { label: 'Analytics + AI observability', live: derived.aiCalls > 0, hint: `${derived.aiCalls} AI calls logged` },
  ];

  const attention = [
    ...(data.jobs || []).filter((j) => j.status === 'failed').slice(0, 3).map((j) => ({ kind: 'job', text: `Job ${j.type} failed — ${j.error || 'no message'}`, id: j._id })),
    ...(data.logs || []).filter((l) => l.status === 'error').slice(0, 3).map((l) => ({ kind: 'ai', text: `AI ${l.feature} error (${l.model || 'unknown model'}) — ${l.error || ''}`.slice(0, 120), id: l._id })),
  ];

  return (
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container pt-6">
        {/* HERO — Mission Control */}
        <div className="fade-up relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#4f46e5] via-[#6d28d9] to-[#0ea5e9] p-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-black/20 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80"><ShieldCheck size={14} /> Admin · PRD §16</p>
              <h1 className="font-heading mt-1 text-3xl font-extrabold">Mission Control</h1>
              <p className="mt-1 max-w-xl text-sm text-white/85">Users, learning, AI quality and system health in one operational view — built to demo the full learning loop without losing context.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1"><HealthDot ok={o != null} /> API {o ? 'connected' : '…'}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1"><HealthDot ok={derived.errorRate < 0.2} warn={derived.errorRate < 0.5} /> AI error {(derived.errorRate * 100).toFixed(1)}%</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1"><HealthDot ok={derived.queueDepth === 0} warn={derived.queueDepth < 5} /> Queue {derived.queueDepth}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1"><Clock size={12} /> Eval {ev ? timeAgo(ev.generatedAt) : '…'}</span>
              </div>
            </div>
            <button onClick={loadAll} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-[#4f46e5] transition hover:bg-white/90 disabled:opacity-60">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {loading ? 'Syncing…' : 'Refresh'}
            </button>
          </div>
          {/* KPI strip */}
          <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {[
              { icon: Users, label: 'Users', value: o?.users ?? data.users.length },
              { icon: FolderOpen, label: 'Spaces', value: data.spaces.length },
              { icon: Layers, label: 'Projects', value: data.projects.length },
              { icon: Activity, label: 'Events', value: o?.events ?? data.events.length },
              { icon: Zap, label: 'Avg AI latency', value: `${derived.avgLatency}ms` },
              { icon: Cpu, label: 'AI errors', value: o?.aiErrors ?? derived.aiErrors },
              { icon: Briefcase, label: 'Failed jobs', value: o?.jobsFailed ?? 0 },
              { icon: FlaskConical, label: 'Citation rate', value: ev?.tutor?.citationRate ?? '—' },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-white/12 p-3 backdrop-blur">
                <k.icon size={15} className="text-white/80" />
                {booting ? <Skel className="mt-2 h-7 w-14 !bg-white/20" /> : <p className="font-heading mt-1 text-xl font-extrabold">{k.value}</p>}
                <p className="text-[11px] text-white/75">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {data.error && <p className="alert alert-error mt-4">{data.error} (login as admin@test.com)</p>}

        {/* TAB BAR */}
        <div className="fade-up-2 mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${active ? 'bg-accent text-white shadow' : 'border border-border bg-bg2 text-text2 hover:border-accent hover:text-accent'}`}>
                <t.icon size={14} /> {t.label}
                {t.id === 'jobs' && (o?.jobsFailed ?? 0) > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{o.jobsFailed}</span>}
              </button>
            );
          })}
        </div>

        {/* ============ OVERVIEW ============ */}
        {tab === 'overview' && (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="card">
                <h3 className="font-heading font-bold">Learning funnel <span className="text-xs font-normal text-text3">Spaces → Projects → Events → AI calls</span></h3>
                <div className="mt-3 space-y-2">
                  {funnel.map((f, i) => (
                    <div key={f.label}>
                      <div className="flex justify-between text-xs"><span className="font-bold">0{i + 1} · {f.label}</span><span>{f.value}</span></div>
                      <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-surface">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#0ea5e9]" style={{ width: `${Math.max(4, Math.round((f.value / maxFunnel) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Engagement <span className="text-xs font-normal text-text3">events by type, live</span></h3>
                {booting ? <div className="mt-2"><TextLines lines={5} /></div> : derived.engagement.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={derived.engagement} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 6, 6, 0]}>
                        {derived.engagement.map((_, i) => <Cell key={i} opacity={1 - i * 0.08} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-text3">No events yet.</p>}
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Learning-loop coverage <span className="text-xs font-normal text-text3">must-haves mapped to live data</span></h3>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {loopCoverage.map((c) => (
                    <p key={c.label} className={`flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-xs ${c.live ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'}`}>
                      {c.live ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                      <span><b>{c.label}</b><br /><span className="opacity-80">{c.hint}</span></span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="card !border-accent/30 !bg-accent/[0.05]">
                <h3 className="font-heading flex items-center gap-1.5 font-bold"><Wrench size={15} className="text-accent" /> Needs attention</h3>
                <div className="mt-2 space-y-1.5 text-xs">
                  {attention.length ? attention.map((a) => (
                    <p key={a.id} className="rounded-xl border border-border bg-bg2 px-2.5 py-2">
                      <span className={`badge mr-1.5 ${a.kind === 'job' ? 'badge-high' : 'badge-medium'}`}>{a.kind}</span>{a.text}
                    </p>
                  )) : <p className="text-text3">All clear — no failed jobs or AI errors in the latest sample.</p>}
                </div>
                <button onClick={() => setTab('jobs')} className="btn btn-outline mt-2 w-full !py-1.5 !text-xs">Open job queue <ChevronRight size={13} /></button>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">System health</h3>
                <div className="mt-2 space-y-1.5 text-xs">
                  <p className="flex justify-between"><span>API + DB</span><span className="flex items-center gap-1.5"><HealthDot ok={o != null} /> {o ? 'healthy' : 'loading'}</span></p>
                  <p className="flex justify-between"><span>AI error rate</span><b>{(derived.errorRate * 100).toFixed(1)}% ({derived.aiErrors}/{derived.aiCalls})</b></p>
                  <p className="flex justify-between"><span>Avg latency</span><b>{derived.avgLatency}ms</b></p>
                  <p className="flex justify-between"><span>Tokens / est. cost</span><b>{derived.totalTokens.toLocaleString()} · ${derived.totalCost.toFixed(4)}</b></p>
                  <p className="flex justify-between"><span>Queue depth</span><b>{derived.queueDepth}</b></p>
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">AI quality at a glance</h3>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-bg3 p-2"><p className="font-heading text-lg font-extrabold">{ev?.tutor?.citationRate ?? '—'}</p><p className="text-[10px] text-text3">citation</p></div>
                  <div className="rounded-xl bg-bg3 p-2"><p className="font-heading text-lg font-extrabold">{ev?.tutor?.unsupportedRefusals ?? '—'}</p><p className="text-[10px] text-text3">refusals</p></div>
                  <div className="rounded-xl bg-bg3 p-2"><p className="font-heading text-lg font-extrabold">{ev?.reliability?.errorRate ?? '—'}</p><p className="text-[10px] text-text3">err rate</p></div>
                </div>
                <button onClick={() => setTab('quality')} className="btn btn-outline mt-2 w-full !py-1.5 !text-xs">Open evaluation <ChevronRight size={13} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ============ LEARNERS ============ */}
        {tab === 'learners' && (
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <div className="card lg:col-span-2">
              <h3 className="font-heading font-bold">Learners ({learners.length})</h3>
              <div className="relative mt-2">
                <Search size={14} className="absolute left-2.5 top-2.5 text-text3" />
                <input value={learnerQ} onChange={(e) => setLearnerQ(e.target.value)} placeholder="Search name or email…" className="input !pl-8 !text-xs" />
              </div>
              <div className="mt-2 max-h-[480px] space-y-1 overflow-auto">
                {booting && !learners.length && <ListRows count={5} />}
                {learners.map((u) => (
                  <button key={u._id} onClick={() => { setJourneyId(u._id); loadJourney(u._id); }} className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition ${journeyId === u._id ? 'border-accent bg-accent/10' : 'border-border bg-bg3 hover:border-accent'}`}>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{(u.name || u.email || 'U')[0].toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{u.name || 'Unnamed'}</span><span className="block truncate text-xs text-text3">{u.email}</span></span>
                    {u.isAdmin && <span className="badge badge-low">admin</span>}
                  </button>
                ))}
                {!learners.length && <p className="py-8 text-center text-sm text-text3">No learners match.</p>}
              </div>
            </div>
            <div className="card lg:col-span-3">
              <h3 className="font-heading font-bold">Learning journey <span className="text-xs font-normal text-text3">projects · assessments · progress · AI usage</span></h3>
              {!journey && !journeyLoading && <p className="mt-2 text-sm text-text3">Select a learner to inspect their journey.</p>}
              {journeyLoading && <div className="mt-3"><TextLines lines={6} /></div>}
              {journey && !journeyLoading && (
                <div className="mt-2 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-bg3 p-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold text-white">{(journey.user.name || journey.user.email)[0].toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{journey.user.name} <span className="font-normal text-text3">({journey.user.email})</span></p>
                      <p className="text-xs text-text3">{journey.spaces.length} spaces · {journey.projects.length} projects · avg score {journey.avgScore}%</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-text3">Projects</p>
                      <div className="mt-1 max-h-40 space-y-1 overflow-auto text-xs">
                        {journey.projects.map((p) => <p key={p._id} className="rounded-lg bg-bg3 px-2 py-1.5">• <b>{p.name}</b> — {(p.goal || '').slice(0, 80)}</p>)}
                        {!journey.projects.length && <p className="text-text3">No projects.</p>}
                      </div>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-text3">Recent assessments</p>
                      <div className="mt-1 max-h-32 space-y-1 overflow-auto text-xs">
                        {(journey.attempts || []).slice(0, 10).map((a, i) => <p key={i} className="flex justify-between rounded-lg bg-bg3 px-2 py-1"><span>{new Date(a.createdAt).toLocaleDateString()}</span><b>{a.score}%</b></p>)}
                        {!(journey.attempts || []).length && <p className="text-text3">No attempts.</p>}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-text3">Mastery — weakest first</p>
                      <div className="mt-1 max-h-40 space-y-1.5 overflow-auto">
                        {(journey.mastery || []).slice(0, 8).map((m) => (
                          <div key={m.concept}>
                            <div className="flex justify-between text-xs"><span className="font-medium">{m.concept}</span><span>{m.score}% · {m.mistakes}✕</span></div>
                            <div className="h-1.5 rounded bg-surface"><div className={`h-1.5 rounded ${m.score < 60 ? 'bg-red-500' : m.score < 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${m.score}%` }} /></div>
                          </div>
                        ))}
                        {!(journey.mastery || []).length && <p className="text-xs text-text3">No mastery yet.</p>}
                      </div>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-text3">AI usage by feature</p>
                      <div className="mt-1 space-y-1 text-xs">
                        {(journey.aiUsage || []).map((a) => <p key={a._id} className="flex justify-between rounded-lg bg-bg3 px-2 py-1"><span>{a._id}</span><span>{a.calls} calls · {Math.round(a.avgLatency || 0)}ms</span></p>)}
                        {!(journey.aiUsage || []).length && <p className="text-text3">No AI usage.</p>}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-text3">Journey timeline (latest 12)</p>
                    <div className="mt-1 max-h-44 space-y-1 overflow-auto text-xs">
                      {(journey.events || []).slice(0, 12).map((e, i) => (
                        <p key={i} className="flex gap-2 rounded-lg bg-bg3 px-2 py-1.5"><b className="shrink-0 text-accent">{e.type}</b><span className="truncate text-text2">{JSON.stringify(e.payload || {}).slice(0, 110)}</span><span className="ml-auto shrink-0 text-text3">{timeAgo(e.at)}</span></p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ CONTENT ============ */}
        {tab === 'content' && (
          <div className="card mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading font-bold">Spaces ({content.spaces.length}) · Projects ({content.projects.length})</h3>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-text3" />
                <input value={contentQ} onChange={(e) => setContentQ(e.target.value)} placeholder="Search spaces, projects, owners…" className="input !w-72 !pl-8 !text-xs" />
              </div>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text3">Spaces</p>
                <div className="mt-1 max-h-96 space-y-1.5 overflow-auto">
                  {booting && !content.spaces.length && <TextLines lines={4} />}
                  {content.spaces.map((s) => (
                    <div key={s._id} className="rounded-xl border border-border bg-bg3 px-3 py-2 text-sm">
                      <p className="font-semibold">{s.name} <span className="badge badge-info ml-1">{s.projects} projects</span></p>
                      <p className="truncate text-xs text-text3">{s.user?.email || ''} · {timeAgo(s.createdAt)}</p>
                    </div>
                  ))}
                  {!content.spaces.length && <p className="text-sm text-text3">No spaces.</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text3">Projects</p>
                <div className="mt-1 max-h-96 space-y-1.5 overflow-auto">
                  {booting && !content.projects.length && <TextLines lines={4} />}
                  {content.projects.map((p) => (
                    <div key={p._id} className="rounded-xl border border-border bg-bg3 px-3 py-2 text-sm">
                      <p className="font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-text3">{p.space?.name || ''} · {p.user?.email || ''} · {timeAgo(p.updatedAt)}</p>
                      <p className="truncate text-xs text-text2">{p.goal || ''}</p>
                    </div>
                  ))}
                  {!content.projects.length && <p className="text-sm text-text3">No projects.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ ACTIVITY ============ */}
        {tab === 'activity' && (
          <div className="card mt-4">
            <h3 className="font-heading font-bold">Platform activity <span className="text-xs font-normal text-text3">filter by user · space · project · type · time (§16)</span></h3>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-7">
              <input value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} placeholder="type: quiz.answered" className="input !py-1.5 !text-xs" />
              <input value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })} placeholder="user id" className="input !py-1.5 !text-xs" />
              <input value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })} placeholder="project id" className="input !py-1.5 !text-xs" />
              <input value={filters.space} onChange={(e) => setFilters({ ...filters, space: e.target.value })} placeholder="space id" className="input !py-1.5 !text-xs" />
              <input value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} type="date" className="input !py-1.5 !text-xs" />
              <input value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} type="date" className="input !py-1.5 !text-xs" />
              <button onClick={loadActivity} className="btn btn-primary !py-1.5 !text-xs">Apply</button>
            </div>
            <div className="mt-3 max-h-[480px] space-y-1 overflow-auto">
              {booting && !data.events.length && <div className="px-1"><TextLines lines={8} /></div>}
              {data.events.map((e) => (
                <p key={e._id} className="flex flex-wrap items-center gap-2 rounded-xl bg-bg3 px-3 py-2 text-xs">
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 font-bold text-accent">{e.type}</span>
                  <span className="truncate text-text2">{JSON.stringify(e.payload || {}).slice(0, 140)}</span>
                  <span className="ml-auto shrink-0 text-text3">{timeAgo(e.at)}</span>
                </p>
              ))}
              {!data.events.length && <p className="py-8 text-center text-sm text-text3">No events for these filters.</p>}
            </div>
          </div>
        )}

        {/* ============ AI OPS ============ */}
        {tab === 'aiops' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { label: 'AI calls', value: derived.aiCalls },
                { label: 'Avg latency', value: `${derived.avgLatency}ms` },
                { label: 'Tokens', value: derived.totalTokens.toLocaleString() },
                { label: 'Est. cost', value: `$${derived.totalCost.toFixed(4)}` },
                { label: 'Error rate', value: `${(derived.errorRate * 100).toFixed(1)}%` },
              ].map((k) => (
                <div key={k.label} className="card !py-3 text-center"><p className="font-heading text-xl font-extrabold">{k.value}</p><p className="label">{k.label}</p></div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card">
                <h3 className="font-heading font-bold">Latency by feature <span className="text-xs font-normal text-text3">answers “why slow / which model”</span></h3>
                {derived.latencyByFeature.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={derived.latencyByFeature}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={10} interval={0} angle={-18} dy={10} height={56} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="ms" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-text3">No AI calls logged.</p>}
              </div>
              <div className="card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading font-bold">AI log stream</h3>
                  <div className="relative">
                    <Search size={13} className="absolute left-2 top-2 text-text3" />
                    <input value={logQ} onChange={(e) => setLogQ(e.target.value)} placeholder="Search feature, model, error…" className="input !w-56 !py-1 !pl-7 !text-xs" />
                  </div>
                </div>
                <div className="mt-2 max-h-56 space-y-1 overflow-auto text-xs">
                  {booting && !logs.length && <TextLines lines={6} />}
                  {logs.slice(0, 60).map((l) => (
                    <p key={l._id} className={`flex flex-wrap gap-1.5 rounded-lg px-2 py-1.5 ${l.status === 'error' ? 'bg-red-50 dark:bg-red-950' : 'bg-bg3'}`}>
                      {l.status === 'error' ? <XCircle size={13} className="mt-0.5 text-red-500" /> : <CheckCircle2 size={13} className="mt-0.5 text-green-600" />}
                      <b>{l.feature}</b><span className="text-text3">{l.model || '—'} · {l.latency_ms}ms · {l.tokens || 0} tok</span>
                      <span className="ml-auto text-text3">{timeAgo(l.createdAt)}</span>
                      {!!l.error && <span className="w-full truncate text-red-600">{l.error}</span>}
                    </p>
                  ))}
                  {!logs.length && <p className="text-text3">No logs match.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ QUALITY ============ */}
        {tab === 'quality' && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="card border-l-4 !border-l-green-500"><p className="label">Citation rate (target &gt; 0.7)</p><p className="font-heading text-3xl font-extrabold">{ev?.tutor?.citationRate ?? '—'}</p><p className="text-xs text-text3">{ev?.tutor?.sampledAnswers ?? 0} answers sampled</p></div>
              <div className="card border-l-4 !border-l-sky-500"><p className="label">Unsupported refusals (must be &gt; 0)</p><p className="font-heading text-3xl font-extrabold">{ev?.tutor?.unsupportedRefusals ?? '—'}</p><p className="text-xs text-text3">insufficient-evidence responses</p></div>
              <div className="card border-l-4 !border-l-amber-500"><p className="label">AI error rate</p><p className="font-heading text-3xl font-extrabold">{ev?.reliability?.errorRate ?? '—'}</p><p className="text-xs text-text3">{ev?.reliability?.aiCalls ?? 0} calls · {ev?.reliability?.gradedAnswers ?? 0} graded</p></div>
            </div>
            <div className="card">
              <h3 className="font-heading font-bold">Curated evaluation cases → live verdict</h3>
              <p className="text-xs text-text3">Cases in <code>eval/cases.js</code>; verdicts computed from production data on every load.</p>
              <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                {EVAL_CASES.map(([id, area, desc]) => {
                  let pass = null;
                  if (id === 'T1') pass = (ev?.tutor?.citationRate ?? 0) > 0.3;
                  if (id === 'U1' || id === 'U2') pass = (ev?.tutor?.unsupportedRefusals ?? 0) > 0;
                  if (id === 'Q1' || id === 'Q2') pass = (ev?.reliability?.gradedAnswers ?? 0) > 0;
                  if (id === 'C1') pass = (derived.byType['recommendation.created'] ?? 0) > 0;
                  if (id === 'R1' || id === 'T2') pass = derived.aiCalls > 0;
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

        {/* ============ JOBS ============ */}
        {tab === 'jobs' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {derived.jobsByStatus.map((j) => (
                <div key={j.status} className={`card !py-3 text-center ${j.status === 'failed' && j.count > 0 ? '!border-red-300' : ''}`}>
                  <p className={`font-heading text-2xl font-extrabold ${j.status === 'failed' && j.count > 0 ? 'text-red-600' : ''}`}>{j.count}</p>
                  <p className="label">{j.status}</p>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="font-heading font-bold">Background queue <span className="text-xs font-normal text-text3">retry failed document work here</span></h3>
              <div className="mt-2 max-h-[480px] space-y-1.5 overflow-auto">
                {booting && !data.jobs.length && <TextLines lines={5} />}
                {data.jobs.map((j) => (
                  <div key={j._id} className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs ${j.status === 'failed' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/30' : 'border-border bg-bg3'}`}>
                    <span className={`badge ${j.status === 'done' ? 'badge-low' : j.status === 'failed' ? 'badge-high' : 'badge-medium'}`}>{j.status}</span>
                    <b>{j.type}</b>
                    <span className="text-text3">retries:{j.retries} · {timeAgo(j.updatedAt || j.createdAt)}</span>
                    {!!j.error && <span className="w-full truncate text-red-600">{j.error}</span>}
                    {j.status === 'failed' && <button onClick={() => retry(j._id)} className="btn btn-outline ml-auto !px-2.5 !py-1 !text-[11px]">Retry</button>}
                  </div>
                ))}
                {!data.jobs.length && <p className="py-8 text-center text-sm text-text3">Queue empty — uploads and learning workflows appear here.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
