import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Target, TrendingUp, Sprout, ArrowRight, Eye, EyeOff, Wand2 } from 'lucide-react';
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

const FEATURES = [
  { icon: GraduationCap, title: 'Learn', desc: 'Upload materials, chat with a tutor grounded in your PDFs' },
  { icon: Target, title: 'Practice', desc: 'Adaptive quizzes that target your weak concepts' },
  { icon: TrendingUp, title: 'Measure', desc: 'Mastery tracking that remembers what you struggle with' },
  { icon: Sprout, title: 'Grow', desc: 'Recommendations guide your next best study step' },
];

export default function Login() {
  const [mode, setMode] = useState('login');
  const [portal, setPortal] = useState('user'); // user | admin (login only)
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

  function switchMode(m) {
    setMode(m);
    setErr('');
    setFieldErrors({});
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
      if (portal === 'admin' && mode === 'login' && !data.user.isAdmin) {
        setErr('This account is not an admin. Use learner login or ask for admin access.');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav(data.user.isAdmin ? '/admin' : '/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Network Error — is backend on :5000?');
    } finally {
      setLoading(false);
    }
  }

  const pwScore = mode === 'register' && form.password ? strength(form.password) : 0;

  return (
    <div className="theme-auth flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fade-up grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-bg2 shadow-xl md:grid-cols-2">
        {/* Left: photo-style panel. Drop a real photo at client/public/login-bg.jpg to use it. */}
        <div
          className="relative hidden flex-col justify-center gap-5 overflow-hidden p-8 text-white md:flex"
          style={{ backgroundImage: "linear-gradient(160deg, rgba(30,27,143,0.55), rgba(20,20,60,0.68)), url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <svg width="20" height="20" viewBox="0 0 60 60" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15 C17 11 25 11 30 15.5 C35 11 43 11 50 15 L50 46 C43 42 35 42 30 46.5 C25 42 17 42 10 46 Z" strokeWidth="4.5" /><line x1="30" y1="15.5" x2="30" y2="46.5" strokeWidth="3.2" /></svg>
            </span>
            <span className="font-heading font-bold text-blue-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">AI Study Companion</span>
          </div>
          <div>
            <h1 className="mt-2 font-heading text-3xl font-extrabold leading-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]">Welcome back to your learning space.</h1>
            <p className="mt-2 text-sm text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">Your projects, progress, and learning context are ready when you are.</p>
          </div>
          <ul className="relative space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="relative flex items-center gap-3">
                <span className="z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15"><f.icon size={17} /></span>
                <span>
                  <span className="block text-sm font-bold drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">{f.title}</span>
                  <span className="block text-[13px] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Right: form */}
        <div className="p-8">
          <h2 className="font-heading text-2xl font-extrabold">
            {mode === 'register' ? 'Create account' : portal === 'admin' ? 'Admin login' : 'Log in'}
          </h2>
          <p className="page-subtitle !mt-1 !text-sm">Pick up right where you left off.</p>
          {mode === 'login' && (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-bg3 p-1 text-sm font-medium">
            <button type="button" onClick={() => { setPortal('user'); setErr(''); }} className={`rounded-lg px-3 py-2 transition ${portal === 'user' ? 'bg-bg2 text-text shadow-sm' : 'text-text3 hover:text-text'}`}>Learner</button>
            <button type="button" onClick={() => { setPortal('admin'); setErr(''); }} className={`rounded-lg px-3 py-2 transition ${portal === 'admin' ? 'bg-bg2 text-text shadow-sm' : 'text-text3 hover:text-text'}`}>Admin</button>
          </div>
          )}
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
                <input className="input pr-11" type={showPw ? 'text' : 'password'} placeholder={mode === 'register' ? 'Min 6 characters' : 'Enter your password'} value={form.password} onChange={(e) => set('password', e.target.value)} />
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
            <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} <ArrowRight size={15} /></button>
            {mode === 'login' && <Link to="/forgot-password" className="block text-center text-sm text-accent hover:underline">Forgot password?</Link>}
          </form>
          {err && <p className="alert alert-error mt-3">{err}{err === 'Email already used' ? ' — click “Have account? Login” below.' : ''}</p>}
          <div className="mt-4 border-t border-border pt-4 text-center text-sm text-text2">
            {mode === 'login' ? (
              <>New to AI Study Companion? <button onClick={() => switchMode('register')} className="font-semibold text-accent hover:underline">Create an account</button></>
            ) : (
              <>Have an account? <button onClick={() => switchMode('login')} className="font-semibold text-accent hover:underline">Log in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
