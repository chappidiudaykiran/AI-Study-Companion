import { Routes, Route, Navigate, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import CrumbCtx, { useCrumbs } from './crumbs.js';
import {
  Moon, Sun, Home as HomeIcon, ShieldCheck, FolderOpen, LayoutGrid, Plus,
  ChevronLeft, ChevronsLeft, ChevronsRight, UploadCloud, MessagesSquare,
  ListChecks,   TrendingUp, BarChart3, LayoutDashboard,
} from 'lucide-react';
import api from './api/client.js';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Project from './pages/Project.jsx';
import Admin from './pages/Admin.jsx';
import Profile from './pages/Profile.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GlobalAnalytics from './pages/GlobalAnalytics.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

function guard(el) {
  return localStorage.getItem('token') ? el : <Navigate to="/login" />;
}

function useDark() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark(!dark)];
}

// Breadcrumb context lives in ./crumbs.js (re-exported here for compat)
export { useCrumbs };

const TOOLS = [
  { tab: 'overview', label: 'Overview', icon: LayoutDashboard },
  { tab: 'materials', label: 'Materials', icon: UploadCloud },
  { tab: 'tutor', label: 'AI Tutor', icon: MessagesSquare, badge: 'AI' },
  { tab: 'quiz', label: 'Quiz', icon: ListChecks },
  { tab: 'growth', label: 'Growth', icon: TrendingUp },
  { tab: 'analytics', label: 'Analytics', icon: BarChart3 },
];

function Sidebar() {
  const nav = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projName, setProjName] = useState('');
  const [projGoal, setProjGoal] = useState('');
  const [formErr, setFormErr] = useState('');
  const [spaceProjects, setSpaceProjects] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return null;

  const onProject = location.pathname.startsWith('/project/');
  const pid = onProject ? location.pathname.split('/')[2] : null;
  const lastProject = JSON.parse(localStorage.getItem('lastProject') || 'null');
  const activeTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const activeSpaceId = new URLSearchParams(location.search).get('space');
  const selSpace = spaces.find((s) => s._id === activeSpaceId) || null;

  useEffect(() => {
    if (onProject) return;
    loadSpaces();
  }, [location.pathname]);

  useEffect(() => {
    if (activeSpaceId) {
      api.get(`/api/spaces/${activeSpaceId}`).then((r) => setSpaceProjects(r.data.projects || [])).catch(() => setSpaceProjects([]));
    } else {
      setSpaceProjects([]);
    }
  }, [activeSpaceId]);

  async function loadSpaces() {
    try {
      const r = await api.get('/api/spaces');
      setSpaces(r.data.spaces || []);
    } catch {}
  }

  async function createSpace(e) {
    e.preventDefault();
    setFormErr('');
    if (spaceName.trim().length < 2) return setFormErr('Name needs at least 2 characters');
    try {
      const { data } = await api.post('/api/spaces', { name: spaceName.trim() });
      setSpaceName('');
      setShowSpaceForm(false);
      await loadSpaces();
      if (data.space) nav(`/?space=${data.space._id}`);
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Could not create space');
    }
  }

  async function createProject(e) {
    e.preventDefault();
    setFormErr('');
    if (projName.trim().length < 2) return setFormErr('Project name needs at least 2 characters');
    if (projGoal.trim().length < 5) return setFormErr('Goal needs at least 5 characters');
    try {
      await api.post('/api/projects', { spaceId: activeSpaceId, name: projName.trim(), description: '', goal: projGoal.trim() });
      setProjName('');
      setProjGoal('');
      setShowProjectForm(false);
      await loadSpaces();
      nav(`/?space=${activeSpaceId}`);
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Could not create project');
    }
  }

  const W = collapsed ? 'w-16' : 'w-64';

  return (
    <aside className={`fixed inset-y-0 left-0 z-[100] hidden ${W} flex-col border-r border-border bg-bg2 transition-all lg:flex`}>
      <div className="flex items-center gap-1.5 px-3 pt-4">
        {!collapsed ? (
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4f46e5] text-white">
              <span style={{ fontSize: '22px', lineHeight: 1 }}>🎓</span>
            </span>
            <span className="min-w-0 text-center leading-tight">
              <span className="block whitespace-nowrap text-[14px] font-bold">AI Study</span>
              <span className="block whitespace-nowrap text-[14px] font-bold">Companion</span>
            </span>
          </span>
        ) : (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4f46e5] text-white">
            <svg width="21" height="21" viewBox="0 0 60 60" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15 C17 11 25 11 30 15.5 C35 11 43 11 50 15 L50 46 C43 42 35 42 30 46.5 C25 42 17 42 10 46 Z" strokeWidth="4.5" />
              <line x1="30" y1="15.5" x2="30" y2="46.5" strokeWidth="3.2" />
            </svg>
          </span>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="btn-ghost btn ml-auto !px-1.5" title="Collapse">
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {user.isAdmin ? (
          <>
            <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
              <LayoutDashboard size={17} className="shrink-0" /> {!collapsed && 'Dashboard'}
            </NavLink>
          </>
        ) : (
        <>{onProject && lastProject ? (
          <>
            <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
              <HomeIcon size={17} className="shrink-0" /> {!collapsed && 'Home'}
            </NavLink>
            <button onClick={() => nav(lastProject.spaceId ? `/?space=${lastProject.spaceId}` : '/')} title={lastProject.spaceName || 'Space'} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text2 transition hover:bg-surface hover:text-text">
              <FolderOpen size={17} className="shrink-0" /> {!collapsed && <span className="truncate">{lastProject.spaceName || 'Space'}</span>}
            </button>
            {!collapsed && <p className="label !mb-1 px-3 pt-2">Project</p>}
            {!collapsed && (
              <div className="rounded-xl border border-border bg-bg3 p-3">
                <p className="flex items-center gap-2 font-semibold"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">{(lastProject.name || 'P')[0]}</span><span className="truncate">{lastProject.name}</span></p>
                <p className="mt-0.5 truncate text-xs text-text3">{lastProject.spaceName || ''}</p>
              </div>
            )}
            {TOOLS.map((t) => {
              const active = activeTab === t.tab;
              return (
                <button
                  key={t.tab}
                  onClick={() => nav(`/project/${pid}?tab=${t.tab}`)}
                  title={t.label}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}
                >
                  <t.icon size={17} className="shrink-0" />
                  {!collapsed && <span>{t.label}</span>}
                  {!collapsed && t.badge && <span className="badge badge-info ml-auto !text-[10px]">{t.badge}</span>}
                </button>
              );
            })}
          </>
        ) : (
          <>
            {!selSpace && (
            <button
              onClick={() => nav('/')}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${!activeSpaceId ? 'border-border bg-bg3' : 'border-transparent hover:bg-surface'}`}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white"><LayoutGrid size={16} /></span>
              {!collapsed && <span className="min-w-0 text-left"><span className="block truncate font-semibold">Spaces</span><span className="block text-xs text-text3">Manage learning spaces</span></span>}
            </button>
            )}
            {!collapsed && !selSpace && (
              <button onClick={() => nav('/?createSpace=1')} className="mt-1 w-full rounded-xl border border-dashed border-border2 px-3 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/5">
                + Create Space
              </button>
            )}
            {(() => {
              const sel = spaces.find((s) => s._id === activeSpaceId);
              if (!sel) return null;
              return (
              <>
                <button onClick={() => nav('/')} className="mt-2 flex w-full items-center gap-1 px-3 text-sm font-medium text-text2 hover:text-text">
                  <span aria-hidden>←</span> {!collapsed && 'Spaces'}
                </button>
                {!collapsed && <p className="label !mb-1 px-3 pt-2">Projects</p>}
                {spaceProjects.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => nav(`/project/${p._id}`)}
                    title={p.name}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition text-text2 hover:bg-surface hover:text-text"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent">{(p.name || 'P')[0].toUpperCase()}</span>
                    {!collapsed && <span className="min-w-0 text-left"><span className="block truncate font-semibold">{p.name}</span><span className="block text-xs text-text3">{p.masteryAvg !== null && p.masteryAvg !== undefined ? `${p.masteryAvg}% mastery` : 'new'}</span></span>}
                  </button>
                ))}
                {!spaceProjects.length && !collapsed && <p className="px-3 text-xs text-text3">No projects yet — create one below.</p>}
                {!collapsed && (
                <>
                  <button onClick={() => nav(`/?space=${sel._id}&newProject=1`)} className="mt-1 w-full rounded-xl border border-dashed border-border2 px-3 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/5">
                    + Create Project
                  </button>
                </>
                )}
              </>
              );
            })()}
            {!collapsed && <p className="label !mb-1 px-3 pt-3">Insights</p>}
            <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
              <LayoutDashboard size={17} className="shrink-0" /> {!collapsed && 'Dashboard'}
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
              <BarChart3 size={17} className="shrink-0" /> {!collapsed && 'Global Analytics'}
            </NavLink>
          </>
        )}
          </>)}
      </div>
    </aside>
  );
}

function Topbar() {
  const nav = useNavigate();
  const location = useLocation();
  const [dark, toggle] = useDark();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { crumbs } = useCrumbs();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initial = (((user?.name || user?.email)) || 'U')[0].toUpperCase();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function signOut() {
    localStorage.clear();
    nav('/login');
  }
  return (
    <header className="navbar lg:left-60">
      <div className="container flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <img src="/logo-icon.svg" alt="AI Study Companion" className="h-9 w-9" />
            <img src="/logo-light.svg" alt="AI Study Companion" className="h-8 w-auto dark:hidden" />
            <img src="/logo-dark.svg" alt="AI Study Companion" className="hidden h-8 w-auto dark:block" />
          </Link>
          <nav className="flex min-w-0 items-center gap-1.5 truncate text-sm">
            {crumbs.length ? crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 truncate">
                {i > 0 && <span className="text-text3">/</span>}
                {c.to ? <Link to={c.to} className="truncate text-text2 hover:text-accent hover:underline">{c.label}</Link> : <b className="truncate">{c.label}</b>}
              </span>
            )) : <Link to="/" className="text-text2 hover:underline">Home</Link>}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={toggle} className="btn-ghost btn !px-2" title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          {user ? (
            <span className="relative" ref={menuRef} title={user.email}>
              <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full border border-border bg-bg2 py-1 pl-1 pr-3 transition hover:border-border2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{initial}</span>
                <span className="hidden max-w-[160px] truncate text-sm font-medium md:inline">{user.name || user.email}</span>
              </button>
              {open && (
                <div className="absolute right-0 top-11 z-[200] w-64 overflow-hidden rounded-2xl border border-border bg-bg2 shadow-xl">
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{initial}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{user.name || 'Account'}</span>
                      <span className="block truncate text-xs text-text3">{user.email}</span>
                    </span>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { setOpen(false); nav('/profile'); }} className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-surface">View profile & settings</button>
                    <button onClick={signOut} className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-surface">Sign out</button>
                  </div>
                </div>
              )}
            </span>
          ) : (
            <Link to="/login" className="btn btn-primary !px-3 !py-1.5">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const location = useLocation();
  const isAuth = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname);
  const [crumbs, setCrumbs] = useState([]);
  return (
    <CrumbCtx.Provider value={{ crumbs, setCrumbs }}>
      <div className="min-h-screen bg-bg">
        {!isAuth && <Sidebar />}
        {!isAuth && <Topbar />}
        <div className={isAuth ? '' : 'lg:pl-60'}>
          <main className={isAuth ? '' : 'page'}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={guard(<Home />)} />
              <Route path="/project/:id" element={guard(<Project />)} />
              <Route path="/admin" element={guard(<Admin />)} />
              <Route path="/profile" element={guard(<Profile />)} />
              <Route path="/dashboard" element={guard(<Dashboard />)} />
              <Route path="/analytics" element={guard(<GlobalAnalytics />)} />
            </Routes>
          </main>
          <footer className="container pb-10 text-xs text-text3">
            Space → Project → Material → Tutor → Quiz → Mastery → Recommendation. Grounded in your PDFs.
          </footer>
        </div>
      </div>
    </CrumbCtx.Provider>
  );
}
