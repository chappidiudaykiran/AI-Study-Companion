import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
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
      const { data } = await api.post(url, form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Network Error — is backend on :5000?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="theme-auth min-h-screen pt-16">
      <div className="container flex min-h-[70vh] items-center justify-center">
        <div className="auth-card fade-up w-full max-w-md rounded-3xl p-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white"><BrainCircuit /></div>
          <h1 className="page-title !text-3xl">{mode === 'login' ? 'Welcome back' : 'Start learning'}</h1>
          <p className="page-subtitle">Grounded tutor · adaptive quizzes · mastery tracking.</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === 'register' && (
              <div className="form-group !mb-0"><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            )}
            <div className="form-group !mb-0"><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group !mb-0"><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}</button>
          </form>
          {err && <p className="alert alert-error mt-3">{err}</p>}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-4 text-sm text-accent hover:underline">
            Switch to {mode === 'login' ? 'register' : 'login'}
          </button>
          <p className="mt-3 text-xs text-text3">Demo: demo@test.com / demo123 · Admin: admin@test.com / admin123</p>
          <Link to="/" className="mt-1 block text-xs text-text3 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
