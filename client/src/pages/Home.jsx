import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import StudyCard from '../components/StudyCard.jsx';
import { useCrumbs } from '../crumbs.js';
import api from '../api/client.js';

function initial(name) {
  return (name || 'S').trim().charAt(0).toUpperCase();
}

const isAdmin = (() => {
  try {
    return !!JSON.parse(localStorage.getItem('user') || '{}').isAdmin;
  } catch {
    return false;
  }
})();

export default function Home() {
  const nav = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [spaceDetail, setSpaceDetail] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [cerr, setCerr] = useState('');
  const [pform, setPform] = useState({ name: '', goal: '' });
  const [showPform, setShowPform] = useState(false);
  const [perr, setPerr] = useState('');
  const createSpaceRef = useRef(null);
  const newProjectRef = useRef(null);
  const createSpaceInputRef = useRef(null);
  const newProjectInputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCrumbs } = useCrumbs();

  async function loadSpaces(selectFirst = false) {
    const { data } = await api.get('/api/spaces');
    const list = data.spaces || [];
    setSpaces(list);
    if (selectFirst && list.length && !selectedId) {
      selectSpace(list[0]._id, list);
    }
  }

  async function selectSpace(id, list = spaces) {
    setSelectedId(id);
    setSearchParams(id ? { space: id } : {});
    try {
      const { data } = await api.get(`/api/spaces/${id}`);
      setSpaceDetail(data.space || list.find((s) => s._id === id) || null);
      setProjects(data.projects || []);
    } catch {
      setProjects([]);
    }
  }

  function clearSelection() {
    setSelectedId(null);
    setSpaceDetail(null);
    setProjects([]);
    setSearchParams({});
    loadSpaces();
  }

  useEffect(() => {
    const sid = searchParams.get('space');
    if (sid && sid !== selectedId) {
      loadSpaces().catch(() => {});
      selectSpace(sid);
    } else if (!sid && selectedId) {
      clearSelection();
    } else if (!sid && !spaces.length) {
      loadSpaces().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Deep-links from sidebar: jump straight to the main-content forms
  useEffect(() => {
    if (searchParams.get('createSpace') && createSpaceRef.current) {
      createSpaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => createSpaceInputRef.current?.focus({ preventScroll: true }), 400);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('newProject')) {
      setShowPform(true);
      setTimeout(() => newProjectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      setTimeout(() => newProjectInputRef.current?.focus({ preventScroll: true }), 550);
    }
  }, [searchParams]);

  const selected = spaceDetail || spaces.find((s) => s._id === selectedId) || null;

  useEffect(() => {
    setCrumbs(selected ? [{ label: 'Spaces', to: '/' }, { label: selected.name }] : [{ label: 'Spaces' }]);
  }, [selectedId, selected?.name]);

  async function createSpace(e) {
    e.preventDefault();
    setCerr('');
    if (form.name.trim().length < 2) return setCerr('Space name needs at least 2 characters');
    try {
      const { data } = await api.post('/api/spaces', { name: form.name.trim(), description: form.description.trim() });
    setForm({ name: '', description: '' });
    await loadSpaces();
    if (data.space) selectSpace(data.space._id);
    } catch (err) {
      setCerr(err.response?.data?.error || 'Could not create space — try again');
    }
  }

  async function deleteSpace(id, name) {
    if (!window.confirm(`Delete space "${name}" and ALL its projects and learning data? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/spaces/${id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed — try again');
      return;
    }
    if (selectedId === id) clearSelection();
    else loadSpaces();
  }

  async function deleteProject(id, name) {
    if (!window.confirm(`Delete project "${name}" and ALL its materials, chats, quizzes and mastery? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/projects/${id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed — try again');
      return;
    }
    selectSpace(selectedId);
  }

  async function createProject(e) {
    e.preventDefault();
    setPerr('');
    if (!selectedId || !pform.name.trim() || !pform.goal.trim()) return;
    try {
      await api.post('/api/projects', { spaceId: selectedId, name: pform.name, description: '', goal: pform.goal });
    } catch (err) {
      setPerr(err.response?.data?.error || 'Could not create project — try again');
      return;
    }
    setPform({ name: '', goal: '' });
    setShowPform(false);
    selectSpace(selectedId);
  }

  return (
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container">
        {/* Mobile spaces nav (global sidebar is desktop-only) */}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {spaces.map((s) => (
            <button
              key={s._id}
              onClick={() => selectSpace(s._id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${s._id === selectedId ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg2'}`}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-[11px] font-bold text-white">{initial(s.name)}</span>
              {s.name}
            </button>
          ))}
        </div>

        {!selected ? (
          <div>
            <div className="page-header fade-up">
              <h1 className="page-title">Your <span className="hero-gradient-text">spaces</span></h1>
              <p className="page-subtitle">{spaces.length} space(s). Select a space to open its workspace.</p>
              {isAdmin && <p className="alert alert-info mt-3">Admin view — read-only. Manage the platform from the <Link to="/admin" className="font-semibold underline">Admin dashboard</Link>.</p>}
            </div>
            {!isAdmin && (
            <div ref={createSpaceRef} className="card fade-up-2">
              <h2 className="font-heading text-lg font-bold">Create a space</h2>
              <form onSubmit={createSpace} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input ref={createSpaceInputRef} className="input flex-1" placeholder="e.g. Machine Learning" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
                <input className="input flex-1" placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <button className="btn btn-primary"><Plus size={16} /> Create</button>
              </form>
              {cerr && <p className="alert alert-error mt-2 !mb-0">{cerr}</p>}
            </div>
            )}
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {spaces.map((s, i) => (
                <StudyCard
                  key={s._id}
                  id={s._id}
                  index={i}
                  compact
                  palette="space"
                  title={s.name}
                  tag={`${s.projects ?? 0} Projects`}
                  description={s.description || 'No description'}
                  openLabel="Open Space"
                  onOpen={() => selectSpace(s._id)}
                  canDelete={!isAdmin}
                  onDelete={() => deleteSpace(s._id, s.name)}
                  confirmText=""
                />
              ))}
            </div>
            {!spaces.length && <div className="card mt-4 text-sm text-text2">No spaces yet — create one above to begin.</div>}
          </div>
        ) : (
          <div>
            <button onClick={clearSelection} className="flex items-center gap-1 text-sm text-text2 hover:text-text">← All spaces</button>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#4f46e5]">Space</p>
                <h1 className="mt-1 font-heading text-3xl font-extrabold text-text">{selected.name}</h1>
                <p className="mt-1 text-sm text-text2">{projects.length} project{projects.length === 1 ? '' : 's'} in this space. Select a project to open its workspace.</p>
              </div>
              {!isAdmin ? (
              <button onClick={() => setShowPform((v) => !v)} className="rounded-lg bg-[#4338ca] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f46e5]">
                + New Project
              </button>
              ) : (
              <p className="text-xs text-text3">Admin view — read-only</p>
              )}
            </div>

            {!isAdmin && showPform && (
              <form ref={newProjectRef} onSubmit={createProject} className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-bg2 p-4 sm:flex-row">
                <input ref={newProjectInputRef} className="input flex-1" placeholder="Project name (min 2 chars)" value={pform.name} onChange={(e) => setPform({ ...pform, name: e.target.value })} required minLength={2} />
                <input className="input flex-1" placeholder="Learning goal (min 5 chars)" value={pform.goal} onChange={(e) => setPform({ ...pform, goal: e.target.value })} required minLength={5} />
                <button className="btn btn-primary whitespace-nowrap">Create project</button>
              </form>
            )}
            {showPform && perr && <p className="alert alert-error mt-2">{perr}</p>}

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {projects.map((p, i) => (
                <StudyCard
                  key={p._id}
                  id={p._id}
                  index={i}
                  compact
                  title={p.name}
                  tag={p.masteryAvg !== null && p.masteryAvg !== undefined ? `${p.masteryAvg}% mastery` : 'New'}
                  description={p.description || p.goal || ''}
                  meta={p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                  progress={p.masteryAvg ?? 0}
                  openLabel="Open Project"
                  onOpen={() => nav(`/project/${p._id}`)}
                  canDelete={!isAdmin}
                  onDelete={() => deleteProject(p._id, p.name)}
                  confirmText=""
                />
              ))}
              {!projects.length && <div className="card text-sm text-text2">No projects yet — click “New Project” to begin.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
