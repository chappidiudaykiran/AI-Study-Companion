import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, MessagesSquare, ListChecks, TrendingUp, ArrowRight, Eye, EyeOff, Wand2 } from 'lucide-react';
import api from '../api/client.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form, mode) {
  const errors = {};
  if (mode === 'register') {
    if (!form.name.trim()) errors.name = 'Name is required';
    else if (form.name.trim().length < 2) errors.name = 'Name needs at least 2 characters';
    else if (form.name.trim().length > 60) errors.name = 'Name must be under 60 characters';
  }
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (!form.password) errors.password = 'Password is required';
  else if (mode === 'register' && form.password.length < 6) errors.password = 'Password needs at least 6 characters';
  else if (mode === 'register' && form.password.length > 100) errors.password = 'Password must be under 100 characters';
  return errors;
}

function suggestPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(s, 4);
}

const STRENGTH_LABEL = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong'];

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const nav = useNavigate();

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    const errors = validate(form, mode);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setErr('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email.trim(), password: form.password }
        : { name: form.name.trim(), email: form.email.trim(), password: form.password };
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

  const pwScore = mode === 'register' && form.password ? strength(form.password) : 0;

  return (
    <div className="theme-auth flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fade-up grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-bg2 shadow-xl md:grid-cols-2">
        {/* Left: product pitch */}
        <div className="hidden flex-col justify-center gap-4 bg-gradient-to-br from-accent to-accent2 p-8 text-white md:flex">
          <img src="/logo-dark.svg" alt="AI Study Companion" className="h-14 w-auto" />
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
            {mode === 'login' ? 'Login with the credentials sent to your mail.' : 'One account for all spaces & projects.'}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); setFieldErrors({}); }} className="ml-2 text-accent hover:underline">
              {mode === 'login' ? 'Need account? Register' : 'Have account? Login'}
            </button>
          </p>
          <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
            {mode === 'register' && (
              <div>
                <label className="label">Name</label>
                <input className="input" placeholder="Your full name" value={form.name} onChange={(e) => set('name', e.target.value)} />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-11" type={showPw ? 'text' : 'password'} placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'} value={form.password} onChange={(e) => set('password', e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text3 hover:text-text" title={showPw ? 'Hide' : 'Show'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
              {mode === 'register' && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={`h-1.5 w-8 rounded ${form.password && i < pwScore ? (pwScore >= 3 ? 'bg-green-500' : pwScore === 2 ? 'bg-amber-500' : 'bg-red-500') : 'bg-surface'}`} />
                      ))}
                    </div>
                    <button type="button" onClick={() => { set('password', suggestPassword()); setShowPw(true); }} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                      <Wand2 size={13} /> Suggest strong password
                    </button>
                  </div>
                  {form.password && <p className="mt-1 text-xs text-text3">{STRENGTH_LABEL[pwScore]}</p>}
                </div>
              )}
            </div>
            <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'} <ArrowRight size={15} /></button>
          </form>
          {err && <p className="alert alert-error mt-3">{err}{err === 'Email already used' ? ' — click “Have account? Login” above.' : ''}</p>}
        </div>
      </div>
    </div>
  );
}
