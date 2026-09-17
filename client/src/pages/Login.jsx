import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, MessagesSquare, ListChecks, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../api/client.js';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'demo@test.com', password: 'demo123' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form;
      const { data } = await api.post(url, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Network Error — is backend on :5000?');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setMode('login');
    setForm({ name: '', email: 'demo@test.com', password: 'demo123' });
    setErr('');
  }
  function fillAdmin() {
    setMode('login');
    setForm({ name: '', email: 'admin@test.com', password: 'admin123' });
    setErr('');
  }

  return (
    <div className="theme-auth flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fade-up grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-bg2 shadow-xl md:grid-cols-2">
        {/* Left: product pitch */}
        <div className="hidden flex-col justify-center gap-4 bg-gradient-to-br from-accent to-accent2 p-8 text-white md:flex">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><BrainCircuit /></span>
          <h1 className="font-heading text-3xl font-extrabold leading-tight">Your learning, <br />measured & guided.</h1>
          <p className="text-sm text-white/85">Upload PDFs → grounded tutor with citations → adaptive quizzes → mastery growth.</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><MessagesSquare size={15} /> Tutor answers cite doc + page</li>
            <li className="flex items-center gap-2"><ListChecks size={15} /> MCQ + open-ended grading</li>
            <li className="flex items-center gap-2"><TrendingUp size={15} /> Weak-concept recommendations</li>
          </ul>
          <p className="text-xs text-white/70">Space → Project → Material → Tutor → Quiz → Growth</p>
        </div>
        {/* Right: form */}
        <div className="p-8">
          <h2 className="font-heading text-2xl font-extrabold">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="page-subtitle !mt-1 !text-sm">
            {mode === 'login' ? 'Login to continue learning.' : 'One account for all spaces & projects.'}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }} className="ml-2 text-accent hover:underline">
              {mode === 'login' ? 'Need account? Register' : 'Have account? Login'}
            </button>
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={fillDemo} className="btn btn-outline !px-3 !py-1.5 !text-xs">Fill demo</button>
            <button type="button" onClick={fillAdmin} className="btn btn-outline !px-3 !py-1.5 !text-xs">Fill admin</button>
          </div>
          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === 'register' && (
              <div><label className="label">Name</label><input className="input" placeholder="Uday Kiran" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            )}
            <div><label className="label">Email</label><input className="input" placeholder="you@test.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Password</label><input className="input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'} <ArrowRight size={15} /></button>
          </form>
          {err && <p className="alert alert-error mt-3">{err}{err === 'Email already used' ? ' — click “Have account? Login” above.' : ''}</p>}
        </div>
      </div>
    </div>
  );
}
