import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import { useCrumbs } from '../crumbs.js';
import api from '../api/client.js';

function initial(name) {
  return (name || 'S').trim().charAt(0).toUpperCase();
}

export default function Home() {
  const [spaces, setSpaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [spaceDetail, setSpaceDetail] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [pform, setPform] = useState({ name: '', goal: '' });
  const [showPform, setShowPform] = useState(false);
  const [perr, setPerr] = useState('');
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
    const sid = new URLSearchParams(window.location.search).get('space');
    loadSpaces(!sid).then(() => {}).catch(() => {});
    if (sid) selectSpace(sid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = spaceDetail || spaces.find((s) => s._id === selectedId) || null;

  useEffect(() => {
    setCrumbs(selected ? [{ label: 'Spaces', to: '/' }, { label: selected.name }] : [{ label: 'Spaces' }]);
  }, [selectedId, selected?.name]);

  async function createSpace(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { data } = await api.post('/api/spaces', form);
    setForm({ name: '', description: '' });
    await loadSpaces();
    if (data.space) selectSpace(data.space._id);
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
            </div>
            <div className="card fade-up-2">
              <h2 className="font-heading text-lg font-bold">Create a space</h2>
              <form onSubmit={createSpace} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input className="input flex-1" placeholder="e.g. Machine Learning" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input className="input flex-1" placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <button className="btn btn-primary"><Plus size={16} /> Create</button>
              </form>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {spaces.map((s) => (
                <button key={s._id} onClick={() => selectSpace(s._id)} className="rounded-2xl border border-border bg-white p-5 text-left shadow-sm transition hover:border-[#a5b4fc]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#ede9fe] text-base font-bold text-[#4f46e5]">{initial(s.name)}</span>
                  <span className="mt-2 block font-semibold text-text">{s.name}</span>
                  <span className="block truncate text-[13px] text-text3">{s.description || 'No description'}</span>
                  <span className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-[#4f46e5]">Open Space <ArrowRight size={14} /></span>
                </button>
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
              <button onClick={() => setShowPform((v) => !v)} className="rounded-lg bg-[#4338ca] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f46e5]">
                + New Project
              </button>
            </div>

            {showPform && (
              <form onSubmit={createProject} className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 sm:flex-row">
                <input className="input flex-1" placeholder="Project name (min 2 chars)" value={pform.name} onChange={(e) => setPform({ ...pform, name: e.target.value })} required minLength={2} />
                <input className="input flex-1" placeholder="Learning goal (min 5 chars)" value={pform.goal} onChange={(e) => setPform({ ...pform, goal: e.target.value })} required minLength={5} />
                <button className="btn btn-primary whitespace-nowrap">Create project</button>
              </form>
            )}
            {showPform && perr && <p className="alert alert-error mt-2">{perr}</p>}

            <div className="mt-5 grid max-w-3xl gap-4">
              {projects.map((p) => {
                const pct = p.masteryAvg ?? 0;
                return (
                  <div key={p._id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#ede9fe] text-lg font-bold text-[#4f46e5]">
                        {initial(p.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">{p.name}</p>
                        <p className="truncate text-[13px] text-text3">
                          {(p.description || p.goal || '').slice(0, 60)}{p.createdAt ? ` · ${new Date(p.createdAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-[#e5e7eb]">
                        <div className="h-1.5 rounded-full bg-[#c7d2fe]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[13px] font-bold text-text">{pct}%</span>
                    </div>
                    <div className="mt-3 border-t border-border pt-3 text-right">
                      <Link to={`/project/${p._id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#4f46e5] hover:underline">
                        Open Project <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                );
              })}
              {!projects.length && <div className="rounded-2xl border border-border bg-white p-5 text-sm text-text2">No projects yet — click “New Project” to begin.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
