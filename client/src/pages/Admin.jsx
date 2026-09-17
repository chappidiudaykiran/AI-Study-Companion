import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Link to="/">← Home</Link>
      <h2>Admin Dashboard</h2>
      {data.error && <p style={{ color: 'red' }}>{data.error} (need isAdmin user)</p>}
      <pre style={{ fontSize: 12 }}>{JSON.stringify(data.overview, null, 2)}</pre>
      <h3>Users ({data.users.length})</h3>
      {data.users.map((u) => <div key={u._id}>{u.name} — {u.email} {u.isAdmin ? '(admin)' : ''}</div>)}
      <h3>Jobs</h3>
      {data.jobs.map((j) => (
        <div key={j._id}>{j.type} {j.status} retries:{j.retries} {j.error} {j.status === 'failed' && <button onClick={() => retry(j._id)}>Retry</button>}</div>
      ))}
      <h3>AI Logs ({data.logs.length})</h3>
      {data.logs.slice(0, 20).map((l) => (
        <div key={l._id} style={{ fontSize: 12 }}>{l.feature} {l.model} {l.latency_ms}ms {l.status} {l.error}</div>
      ))}
      <h3>Recent activity</h3>
      {data.events.map((e) => <div key={e._id} style={{ fontSize: 12 }}>{e.type} — {JSON.stringify(e.payload).slice(0, 120)}</div>)}
    </div>
  );
}
