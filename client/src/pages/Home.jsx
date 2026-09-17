import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Target, UploadCloud, MessagesSquare, ListChecks, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import api from '../api/client.js';

const STEPS = [
  { icon: FolderOpen, title: '1. Space', desc: 'Broad area (e.g. ML)' },
  { icon: Target, title: '2. Project', desc: 'Goal-focused workspace' },
  { icon: UploadCloud, title: '3. Material', desc: 'Upload PDF, auto-processed' },
  { icon: MessagesSquare, title: '4. Tutor', desc: 'Ask, get cited answers' },
  { icon: ListChecks, title: '5. Quiz', desc: 'Adaptive MCQ + open' },
  { icon: TrendingUp, title: '6. Growth', desc: 'Mastery + next step' },
];

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
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container">
        <div className="page-header fade-up">
          <h1 className="page-title">What are you learning <span className="hero-gradient-text">today?</span></h1>
          <p className="page-subtitle">Create a space → project → upload PDF → chat with tutor → quiz → track mastery. Everything stays in its project.</p>
        </div>

        {global && (
          <div className="grid-4 fade-up-2">
            <div className="card"><p className="label">Quiz attempts</p><p className="font-heading text-3xl font-extrabold">{global.attempts}</p></div>
            <div className="card"><p className="label">Average score</p><p className="font-heading text-3xl font-extrabold">{global.avgScore}%</p></div>
            <div className="card"><p className="label">Spaces</p><p className="font-heading text-3xl font-extrabold">{spaces.length}</p></div>
            <div className="card"><p className="label">Concepts needing attention</p><p className="font-heading text-3xl font-extrabold">{global.attention?.length ?? 0}</p></div>
          </div>
        )}

        {global && ((global.recentProjects || []).length > 0 || (global.attention || []).length > 0 || global.nextAction) && (
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div className="card fade-up-3">
              <h2 className="font-heading font-bold">Continue learning</h2>
              <div className="mt-2 space-y-1 text-sm">
                {(global.recentProjects || []).map((p) => (
                  <Link key={p.id} to={`/project/${p.id}`} className="block rounded-lg px-2 py-1.5 hover:bg-surface">
                    <span className="font-semibold text-accent">{p.name}</span>
                    <span className="block text-xs text-text3">{p.space} — {p.goal}</span>
                  </Link>
                ))}
                {!(global.recentProjects || []).length && <p className="text-sm text-text3">No projects yet.</p>}
              </div>
            </div>
            <div className="card fade-up-3">
              <h2 className="font-heading font-bold">Needs attention</h2>
              <div className="mt-2 space-y-1 text-sm">
                {(global.attention || []).map((a, i) => (
                  <p key={i} className="rounded-lg bg-bg3 px-2 py-1.5">
                    <b>{a.concept}</b> {a.score}% · {a.mistakes} mistakes
                    {a.projectId && <Link to={`/project/${a.projectId}`} className="ml-1 text-accent hover:underline">({a.project})</Link>}
                  </p>
                ))}
                {!(global.attention || []).length && <p className="text-sm text-text3">Nothing weak right now. Take a quiz!</p>}
              </div>
            </div>
            <div className="card fade-up-3">
              <h2 className="font-heading font-bold">Recommended next step</h2>
              {global.nextAction ? (
                <>
                  <p className="mt-2 text-sm">{global.nextAction.text}</p>
                  {global.nextAction.projectId && <Link to={`/project/${global.nextAction.projectId}`} className="mt-1 inline-block text-sm text-accent hover:underline">Open {global.nextAction.project} →</Link>}
                </>
              ) : <p className="mt-2 text-sm text-text3">Upload material and take a quiz to get recommendations.</p>}
            </div>
          </div>
        )}

        <div className="card fade-up-3 mt-5">
          <h2 className="font-heading text-lg font-bold">How it works — no searching needed</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {STEPS.map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-bg3 p-3">
                <s.icon size={18} className="text-accent" />
                <p className="mt-1 text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-text2">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card fade-up-4 mt-5">
          <h2 className="font-heading text-lg font-bold">Create a space</h2>
          <form onSubmit={create} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input className="input flex-1" placeholder="e.g. Machine Learning" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input flex-1" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button className="btn btn-primary"><Plus size={16} /> Create</button>
          </form>
        </div>

        <h2 className="mb-3 mt-8 font-heading text-xl font-bold">Your spaces</h2>
        {!spaces.length && <div className="card text-sm text-text2">No spaces yet — create one above to begin.</div>}
        <div className="grid-3">
          {spaces.map((s) => <SpaceCard key={s._id} space={s} reload={load} />)}
        </div>
      </div>
    </div>
  );
}

function SpaceCard({ space, reload }) {
  const [projects, setProjects] = useState([]);
  const [show, setShow] = useState(false);
  const [pform, setPform] = useState({ name: '', goal: '' });

  async function open() {
    setShow(!show);
    if (!show) {
      const { data } = await api.get(`/api/spaces/${space._id}`);
      setProjects(data.projects || []);
    }
  }
  async function createProject(e) {
    e.preventDefault();
    await api.post('/api/projects', { spaceId: space._id, name: pform.name, description: '', goal: pform.goal });
    const { data } = await api.get(`/api/spaces/${space._id}`);
    setProjects(data.projects || []);
    setPform({ name: '', goal: '' });
    reload();
  }
  return (
    <div className="card">
      <p className="font-heading text-lg font-bold">{space.name}</p>
      <p className="text-sm text-text2">{space.description || 'No description'}</p>
      <button onClick={open} className="btn btn-outline mt-3 !px-3 !py-1.5">{show ? 'Hide projects' : 'Open projects'} <ArrowRight size={14} /></button>
      {show && (
        <div className="mt-3 border-t border-border pt-3">
          <form onSubmit={createProject} className="grid gap-2">
            <input className="input" placeholder="Project name (e.g. Neural Nets)" value={pform.name} onChange={(e) => setPform({ ...pform, name: e.target.value })} required />
            <input className="input" placeholder="Learning goal (min 5 chars)" value={pform.goal} onChange={(e) => setPform({ ...pform, goal: e.target.value })} required />
            <button className="btn btn-primary !py-2">Create project</button>
          </form>
          <div className="mt-2 space-y-1">
            {projects.map((p) => (
              <Link key={p._id} to={`/project/${p._id}`} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface">
                <span className="font-semibold text-accent">{p.name}</span> <span className="text-text2">— {p.goal}</span>
                <span className="block text-xs text-text3">
                  {p.masteryAvg !== null && p.masteryAvg !== undefined ? `mastery ${p.masteryAvg}% · ` : 'no mastery yet · '}{p.attempts ?? 0} attempts
                  {p.weakest && ` · weak: ${p.weakest.concept} (${p.weakest.score}%)`}
                </span>
              </Link>
            ))}
            {!projects.length && <p className="text-xs text-text3">No projects yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
