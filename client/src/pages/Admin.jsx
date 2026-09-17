import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Activity, Cpu, Briefcase } from 'lucide-react';
import api from '../api/client.js';

export default function Admin() {
  const [data, setData] = useState({ overview: null, users: [], logs: [], jobs: [], events: [] });

  useEffect(() => {
    (async () => {
      try {
        const [o, u, l, j, e] = await Promise.all([
          api.get('/api/admin/overview'),
          api.get('/api/admin/users'),
          api.get('/api/admin/ailogs'),
          api.get('/api/admin/jobs'),
          api.get('/api/admin/activity?limit=30'),
        ]);
        setData({ overview: o.data, users: u.data.users, logs: l.data.logs, jobs: j.data.jobs, events: e.data.events });
      } catch (err) {
        setData((d) => ({ ...d, error: err.response?.data?.error || err.message }));
      }
    })();
  }, []);

  async function retry(id) {
    await api.post(`/api/admin/jobs/${id}/retry`);
    window.location.reload();
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
          <p className="page-subtitle">Users, learning activity, AI usage & quality, background jobs, system health.</p>
        </div>
        {data.error && <p className="alert alert-error">{data.error} (login as admin@test.com)</p>}
        <div className="grid-4 fade-up-2">
          {cards.map((c) => (
            <div key={c.label} className="card"><c.icon size={18} className="text-accent" /><p className="label mt-1">{c.label}</p><p className="font-heading text-3xl font-extrabold">{c.value}</p></div>
          ))}
        </div>
        <div className="card fade-up-3 mt-5">
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
            <h2 className="font-heading font-bold">Recent activity</h2>
            <div className="mt-2 max-h-64 space-y-1 overflow-auto text-xs text-text2">{data.events.map((e) => <p key={e._id}>{e.type} — {JSON.stringify(e.payload).slice(0, 120)}</p>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
