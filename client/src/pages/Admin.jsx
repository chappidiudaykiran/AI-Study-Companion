import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Activity, Cpu, Briefcase } from 'lucide-react';
import api from '../api/client.js';

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

export default function Admin() {
  const [data, setData] = useState({ overview: null, users: [], logs: [], jobs: [], events: [], spaces: [], projects: [], evaluation: null });
  const [filters, setFilters] = useState({ type: '', project: '', space: '', from: '', to: '' });
  const [journeyId, setJourneyId] = useState('');
  const [journey, setJourney] = useState(null);

  async function loadActivity(f = filters) {
    const qs = new URLSearchParams({ limit: 30, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }).toString();
    const e = await api.get(`/api/admin/activity?${qs}`);
    setData((d) => ({ ...d, events: e.data.events }));
  }

  useEffect(() => {
    (async () => {
      try {
        const [o, u, l, j, e, s, p, ev] = await Promise.all([
          api.get('/api/admin/overview'),
          api.get('/api/admin/users'),
          api.get('/api/admin/ailogs'),
          api.get('/api/admin/jobs'),
          api.get('/api/admin/activity?limit=30'),
          api.get('/api/admin/spaces'),
          api.get('/api/admin/projects'),
          api.get('/api/admin/evaluation'),
        ]);
        setData({ overview: o.data, users: u.data.users, logs: l.data.logs, jobs: j.data.jobs, events: e.data.events, spaces: s.data.spaces, projects: p.data.projects, evaluation: ev.data });
      } catch (err) {
        setData((d) => ({ ...d, error: err.response?.data?.error || err.message }));
      }
    })();
  }, []);

  async function retry(id) {
    await api.post(`/api/admin/jobs/${id}/retry`);
    window.location.reload();
  }

  async function loadJourney() {
    if (!journeyId) return;
    const { data: j } = await api.get(`/api/admin/users/${journeyId}/journey`);
    setJourney(j);
  }

  const cards = data.overview ? [
    { icon: Users, label: 'Users', value: data.overview.users },
    { icon: Activity, label: 'Events', value: data.overview.events },
    { icon: Cpu, label: 'AI errors', value: data.overview.aiErrors },
    { icon: Briefcase, label: 'Failed jobs', value: data.overview.jobsFailed },
  ] : [];

  return (
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container">
        <Link to="/" className="text-sm text-text2 hover:underline">← Home</Link>
        <div className="page-header fade-up">
          <h1 className="page-title">Admin <span className="hero-gradient-text">Dashboard</span></h1>
          <p className="page-subtitle">Users, spaces, projects, learning activity, AI usage & quality, background jobs, system health.</p>
        </div>
        {data.error && <p className="alert alert-error">{data.error} (login as admin@test.com)</p>}
        <div className="grid-4 fade-up-2">
          {cards.map((c) => (
            <div key={c.label} className="card"><c.icon size={18} className="text-accent" /><p className="label mt-1">{c.label}</p><p className="font-heading text-3xl font-extrabold">{c.value}</p></div>
          ))}
        </div>

        <div className="card fade-up-3 mt-5">
          <h2 className="font-heading font-bold">User journey drill-down</h2>
          <p className="text-xs text-text3">Inspect a learner: projects, assessments, progress, AI usage.</p>
          <div className="mt-2 flex gap-2">
            <select value={journeyId} onChange={(e) => setJourneyId(e.target.value)} className="input max-w-sm">
              <option value="">Select user…</option>
              {data.users.map((u) => <option key={u._id} value={u._id}>{u.name} — {u.email}</option>)}
            </select>
            <button onClick={loadJourney} className="btn btn-primary !py-2">Inspect</button>
          </div>
          {journey && (
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-bg3 p-3">
                <p className="font-bold">{journey.user.name} ({journey.user.email})</p>
                <p>Spaces: {journey.spaces.length} · Projects: {journey.projects.length} · Avg score: {journey.avgScore}%</p>
                <p className="mt-1 font-semibold">Projects:</p>
                {journey.projects.map((p) => <p key={p._id} className="text-xs">• {p.name} — {p.goal}</p>)}
              </div>
              <div className="rounded-xl bg-bg3 p-3">
                <p className="font-bold">Mastery (weakest first)</p>
                {journey.mastery.slice(0, 6).map((m) => <p key={m.concept} className="text-xs">{m.concept}: {m.score}% · {m.mistakes} mistakes</p>)}
                <p className="mt-1 font-bold">AI usage by feature</p>
                {(journey.aiUsage || []).map((a) => <p key={a._id} className="text-xs">{a._id}: {a.calls} calls, {Math.round(a.avgLatency || 0)}ms avg</p>)}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="card mt-5">
            <h2 className="font-heading font-bold">Spaces ({data.spaces.length})</h2>
            <div className="mt-2 max-h-56 space-y-1 overflow-auto text-sm">{data.spaces.map((s) => <p key={s._id}>{s.name} — {s.projects} projects <span className="text-xs text-text3">({s.user?.email})</span></p>)}</div>
          </div>
          <div className="card mt-5">
            <h2 className="font-heading font-bold">Projects ({data.projects.length})</h2>
            <div className="mt-2 max-h-56 space-y-1 overflow-auto text-sm">{data.projects.map((p) => <p key={p._id}>{p.name} <span className="text-xs text-text3">({p.space?.name} · {p.user?.email})</span></p>)}</div>
          </div>
        </div>

        <div className="card mt-5">
          <h2 className="font-heading font-bold">AI evaluation (live, rule-based)</h2>
          <p className="text-xs text-text3">Computed from production data on every load. Curated cases in <code>eval/cases.js</code>.</p>
          {data.evaluation ? (
            <div className="mt-2 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-xl bg-bg3 p-3"><p className="label">Citation rate</p><p className="font-heading text-2xl font-extrabold">{data.evaluation.tutor.citationRate ?? '—'}</p><p className="text-xs text-text3">{data.evaluation.tutor.sampledAnswers} answers sampled</p></div>
              <div className="rounded-xl bg-bg3 p-3"><p className="label">Unsupported refusals</p><p className="font-heading text-2xl font-extrabold">{data.evaluation.tutor.unsupportedRefusals}</p><p className="text-xs text-text3">insufficient-evidence responses</p></div>
              <div className="rounded-xl bg-bg3 p-3"><p className="label">AI error rate</p><p className="font-heading text-2xl font-extrabold">{data.evaluation.reliability.errorRate}</p><p className="text-xs text-text3">{data.evaluation.reliability.aiCalls} calls · {data.evaluation.reliability.gradedAnswers} graded</p></div>
            </div>
          ) : <p className="text-sm text-text3">Loading…</p>}
          <div className="mt-2 text-xs text-text2">
            {EVAL_CASES.map(([id, area, desc]) => <p key={id}><b>{id}</b> [{area}] {desc}</p>)}
          </div>
        </div>

        <div className="card mt-5">
          <h2 className="font-heading font-bold">Users ({data.users.length})</h2>
          <div className="mt-2 space-y-1 text-sm">{data.users.map((u) => <p key={u._id}>{u.name} — {u.email} {u.isAdmin && <span className="badge badge-low ml-1">admin</span>}</p>)}</div>
        </div>
        <div className="card mt-5">
          <h2 className="font-heading font-bold">Background jobs</h2>
          <p className="text-xs text-text3">Retry failed document processing here.</p>
          <div className="mt-2 space-y-1 text-sm">
            {data.jobs.map((j) => (
              <p key={j._id}>{j.type} <b>{j.status}</b> retries:{j.retries} <span className="text-text3">{j.error}</span> {j.status === 'failed' && <button onClick={() => retry(j._id)} className="btn btn-outline ml-2 !px-2 !py-0.5 !text-xs">Retry</button>}</p>
            ))}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card mt-5">
            <h2 className="font-heading font-bold">AI usage (latest 20)</h2>
            <p className="text-xs text-text3">Model · feature · latency · status — answers “why slow / which model / what failed”.</p>
            <div className="mt-2 max-h-64 space-y-1 overflow-auto text-xs text-text2">{data.logs.slice(0, 20).map((l) => <p key={l._id}>{l.feature} · {l.model} · {l.latency_ms}ms · {l.status} {l.error}</p>)}</div>
          </div>
          <div className="card mt-5">
            <h2 className="font-heading font-bold">Activity (filterable)</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              <input value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} placeholder="type e.g. quiz.answered" className="input !py-1.5 !text-xs" />
              <input value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })} placeholder="project id" className="input !py-1.5 !text-xs" />
              <input value={filters.space} onChange={(e) => setFilters({ ...filters, space: e.target.value })} placeholder="space id" className="input !py-1.5 !text-xs" />
              <input value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} type="date" className="input !py-1.5 !text-xs" />
              <input value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} type="date" className="input !py-1.5 !text-xs" />
              <button onClick={() => loadActivity()} className="btn btn-primary !py-1.5 !text-xs">Apply</button>
            </div>
            <div className="mt-2 max-h-64 space-y-1 overflow-auto text-xs text-text2">{data.events.map((e) => <p key={e._id}>{e.type} — {JSON.stringify(e.payload).slice(0, 120)}</p>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
