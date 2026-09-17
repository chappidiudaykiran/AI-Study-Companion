import { Routes, Route, Navigate, Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BrainCircuit, Moon, Sun } from 'lucide-react';
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

function Navbar() {
  const nav = useNavigate();
  const [dark, toggle] = useDark();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const link = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  return (
    <header className="navbar">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white"><BrainCircuit size={20} /></span>
          <span className="nav-logo">Study Companion</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/admin" className={link}>Admin</NavLink>
          <button onClick={toggle} className="btn-ghost btn !px-2" title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          {user ? (
            <>
              <span className="hidden text-sm text-text2 md:inline">{user.email}</span>
              <button onClick={() => { localStorage.clear(); nav('/login'); }} className="btn btn-outline !px-3 !py-1.5">Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary !px-3 !py-1.5">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="page">
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
  );
}
