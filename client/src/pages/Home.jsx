import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Home() {
  const [spaces, setSpaces] = useState([]);
  const [global, setGlobal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  async function load() {
    const { data } = await api.get('/api/spaces');
    setSpaces(data.spaces || []);
    try {
      const g = await api.get('/api/analytics/global');
      setGlobal(g.data);
    } catch {}
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function create(e) {
    e.preventDefault();
    await api.post('/api/spaces', form);
    setForm({ name: '', description: '' });
    load();
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>AI Study Companion</h1>
      <p><Link to="/login">Login</Link> | <Link to="/admin">Admin</Link> | <button onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button></p>
      {global && <p>Continue learning: {global.attempts} attempts, avg {global.avgScore}%</p>}
      <h2>Spaces</h2>
      <form onSubmit={create} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Space name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button>Create space</button>
      </form>
      {spaces.map((s) => (
        <SpaceCard key={s._id} space={s} reload={load} />
      ))}
    </div>
  );
}

function SpaceCard({ space, reload }) {
  const [projects, setProjects] = useState([]);
  const [show, setShow] = useState(false);
  const [pform, setPform] = useState({ name: '', description: '', goal: '' });

  async function open() {
    setShow(!show);
    if (!show) {
      const { data } = await api.get(`/api/spaces/${space._id}`);
      setProjects(data.projects || []);
    }
  }
  async function createProject(e) {
    e.preventDefault();
    await api.post('/api/projects', { spaceId: space._id, ...pform });
    const { data } = await api.get(`/api/spaces/${space._id}`);
    setProjects(data.projects || []);
    setPform({ name: '', description: '', goal: '' });
    reload();
  }
  return (
    <div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
      <b>{space.name}</b> — {space.description} <button onClick={open}>{show ? 'Hide' : 'Open'}</button>
      {show && (
        <>
          <form onSubmit={createProject} style={{ display: 'flex', gap: 6, margin: '8px 0', flexWrap: 'wrap' }}>
            <input placeholder="Project name" value={pform.name} onChange={(e) => setPform({ ...pform, name: e.target.value })} required />
            <input placeholder="Goal (min 5 chars)" value={pform.goal} onChange={(e) => setPform({ ...pform, goal: e.target.value })} required style={{ minWidth: 220 }} />
            <button>Create project</button>
          </form>
          {projects.map((p) => (
            <div key={p._id}><Link to={`/project/${p._id}`}>{p.name}</Link> — {p.goal}</div>
          ))}
        </>
      )}
    </div>
  );
}
