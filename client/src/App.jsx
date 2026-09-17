import { Routes, Route, Navigate, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BrainCircuit, Moon, Sun, Home as HomeIcon, ShieldCheck, LogOut, UploadCloud, MessagesSquare, ListChecks, TrendingUp, BarChart3 } from 'lucide-react';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Project from './pages/Project.jsx';
import Admin from './pages/Admin.jsx';

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

function Sidebar() {
  const nav = useNavigate();
  const [dark, toggle] = useDark();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const link = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`;
  if (!user) return null;
  return (
    <aside className="fixed inset-y-0 left-0 z-[100] hidden w-60 flex-col border-r border-border bg-bg2 lg:flex">
      <Link to="/" className="flex items-center gap-2 px-5 pt-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white"><BrainCircuit size={20} /></span>
        <span className="nav-logo !text-lg">Study Companion</span>
      </Link>
      <nav className="mt-6 flex-1 space-y-1 px-3">
        <p className="label !mb-1 px-3">Workspace</p>
        <NavLink to="/" end className={link}><HomeIcon size={17} /> Home</NavLink>
        {user.isAdmin && <NavLink to="/admin" className={link}><ShieldCheck size={17} /> Admin</NavLink>}
        <div className="mt-4 rounded-xl border border-border bg-bg3 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-text2">Learning path</p>
          <div className="mt-1 space-y-0.5">
            {[
              { n: 1, label: 'Materials', hint: 'upload PDF', tab: 'materials', icon: UploadCloud },
              { n: 2, label: 'Tutor', hint: 'ask with citations', tab: 'tutor', icon: MessagesSquare },
              { n: 3, label: 'Quiz', hint: 'MCQ + open', tab: 'quiz', icon: ListChecks },
              { n: 4, label: 'Growth', hint: 'mastery + next', tab: 'growth', icon: TrendingUp },
              { n: 5, label: 'Analytics', hint: 'progress', tab: 'analytics', icon: BarChart3 },
            ].map((s) => (
              <button
                key={s.tab}
                onClick={() => {
                  const pid = localStorage.getItem('lastProjectId');
                  nav(pid ? `/project/${pid}?tab=${s.tab}` : '/');
                }}
                title={`Go to ${s.label}`}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-text2 transition hover:bg-surface hover:text-text"
              >
                <s.icon size={13} className="shrink-0 text-accent" />
                <span><b>{s.n}. {s.label}</b> — {s.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between px-1">
          <p className="max-w-[130px] truncate text-xs text-text2">{user.email}</p>
          <button onClick={toggle} className="btn btn-ghost !px-2 !py-1" title="Toggle theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        </div>
        <button onClick={() => { localStorage.clear(); nav('/login'); }} className="btn btn-outline mt-2 w-full !py-1.5 !text-xs"><LogOut size={14} /> Logout</button>
      </div>
    </aside>
  );
}

function Topbar() {
  const nav = useNavigate();
  const [dark, toggle] = useDark();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const link = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  return (
    <header className="navbar lg:left-60">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white"><BrainCircuit size={20} /></span>
            <span className="nav-logo">Study Companion</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink to="/" end className={link}>Home</NavLink>
            {user?.isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
          </nav>
        </div>
        <nav className="flex items-center gap-1">
          <span className="mr-1 hidden max-w-[180px] truncate text-xs text-text3 md:inline">{user?.email || ''}</span>
          <button onClick={toggle} className="btn-ghost btn !px-2" title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          {user ? (
            <button onClick={() => { localStorage.clear(); nav('/login'); }} className="btn btn-outline !px-3 !py-1.5">Logout</button>
          ) : (
            <Link to="/login" className="btn btn-primary !px-3 !py-1.5">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const location = useLocation();
  const isAuth = location.pathname === '/login';
  return (
    <div className="min-h-screen bg-bg">
      {!isAuth && <Sidebar />}
      {!isAuth && <Topbar />}
      <div className={isAuth ? '' : 'lg:pl-60'}>
        <main className={isAuth ? '' : 'page'}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={guard(<Home />)} />
            <Route path="/project/:id" element={guard(<Project />)} />
            <Route path="/admin" element={guard(<Admin />)} />
          </Routes>
        </main>
        <footer className="container pb-10 text-xs text-text3">
          Space → Project → Material → Tutor → Quiz → Mastery → Recommendation. Grounded in your PDFs.
        </footer>
      </div>
    </div>
  );
}
