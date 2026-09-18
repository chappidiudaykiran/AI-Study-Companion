import { Routes, Route, Navigate, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CrumbCtx, { useCrumbs } from './crumbs.js';
import {
  BrainCircuit, Moon, Sun, Home as HomeIcon, ShieldCheck, LogOut,
  ChevronLeft, ChevronsLeft, ChevronsRight, UploadCloud, MessagesSquare,
  ListChecks,   TrendingUp, BarChart3, LayoutDashboard,
} from 'lucide-react';
import api from './api/client.js';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Project from './pages/Project.jsx';
import Admin from './pages/Admin.jsx';
import Profile from './pages/Profile.jsx';
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
  const [dark, toggle] = useDark();
  const [collapsed, setCollapsed] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return null;

  const onProject = location.pathname.startsWith('/project/');
  const pid = onProject ? location.pathname.split('/')[2] : null;
  const lastProject = JSON.parse(localStorage.getItem('lastProject') || 'null');
  const activeTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const activeSpaceId = new URLSearchParams(location.search).get('space');

  useEffect(() => {
    if (onProject) return;
    api.get('/api/spaces').then((r) => setSpaces(r.data.spaces || [])).catch(() => {});
  }, [location.pathname]);

  const initial = ((user.name || user.email) || 'U')[0].toUpperCase();
  const W = collapsed ? 'w-16' : 'w-64';

  return (
    <aside className={`fixed inset-y-0 left-0 z-[100] hidden ${W} flex-col border-r border-border bg-bg2 transition-all lg:flex`}>
      <div className="flex items-center gap-2 px-4 pt-4">
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <img src="/logo-light.svg" alt="AI Study Companion" className="h-11 w-auto dark:hidden" />
            <img src="/logo-dark.svg" alt="AI Study Companion" className="hidden h-11 w-auto dark:block" />
          </span>
        ) : (
          <img src="/logo-icon.svg" alt="AI Study Companion" className="h-9 w-9 shrink-0" />
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="btn-ghost btn ml-auto !px-1.5" title="Collapse">
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {onProject && lastProject ? (
          <>
            <button onClick={() => nav(lastProject.spaceId ? `/?space=${lastProject.spaceId}` : '/')} className="nav-link flex w-full items-center gap-2 !py-2">
              <ChevronLeft size={15} /> {!collapsed && <span className="truncate">{lastProject.spaceName || 'Space'}</span>}
            </button>
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
            <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
              <HomeIcon size={17} className="shrink-0" /> {!collapsed && 'Spaces'}
            </NavLink>
            {user.isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
                <ShieldCheck size={17} className="shrink-0" /> {!collapsed && 'Admin'}
              </NavLink>
            )}
            {!collapsed && <p className="label !mb-1 px-3 pt-3">Spaces</p>}
            {spaces.map((s) => {
              const active = activeSpaceId === s._id;
              return (
              <button
                key={s._id}
                onClick={() => nav(`/?space=${s._id}`)}
                title={s.name}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white text-xs font-bold">{(s.name || 'S')[0].toUpperCase()}</span>
                {!collapsed && <span className="min-w-0 text-left"><span className="block truncate font-semibold">{s.name}</span><span className="block text-xs text-text3">{s.projects ?? ''} projects</span></span>}
              </button>
              );
            })}
          </>
        )}
      </div>

      <div className="border-t border-border p-3">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="flex items-center gap-2 text-xs text-text2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">{initial}</span><Link to="/profile" className="max-w-[120px] truncate hover:text-accent hover:underline" title={user.email}>{user.name || user.email}</Link></p>
              <button onClick={toggle} className="btn btn-ghost !px-2 !py-1" title="Toggle theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            </div>
            <button onClick={() => { localStorage.clear(); nav('/login'); }} className="btn btn-outline mt-2 w-full !py-1.5 !text-xs"><LogOut size={14} /> Logout</button>
          </>
        ) : (
          <button onClick={() => { localStorage.clear(); nav('/login'); }} className="btn btn-outline w-full !px-0 !py-1.5" title="Logout"><LogOut size={14} /></button>
        )}
      </div>
    </aside>
  );
}

function Topbar() {
  const nav = useNavigate();
  const [dark, toggle] = useDark();
  const { crumbs } = useCrumbs();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initial = (((user?.name || user?.email)) || 'U')[0].toUpperCase();
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
            <span className="flex items-center gap-2 text-sm" title={user.email}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{initial}</span>
              <Link to="/profile" className="hidden max-w-[200px] truncate text-text2 hover:text-accent hover:underline xl:inline" title={`${user.name || ''} · ${user.email}`}>{user.name || user.email}</Link>
              <button onClick={() => { localStorage.clear(); nav('/login'); }} className="btn btn-outline !px-3 !py-1.5">Logout</button>
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
