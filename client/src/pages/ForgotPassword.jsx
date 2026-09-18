import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, MailCheck, ArrowLeft } from 'lucide-react';
import api from '../api/client.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return setErr('Email is required');
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter a valid email address');
    setErr('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setDone(true);
    } catch (err) {
      setErr(err.response?.data?.error || 'Could not send reset mail — try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="theme-auth flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fade-up w-full max-w-md rounded-3xl border border-border bg-bg2 p-8 shadow-xl">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white"><BrainCircuit /></span>
        <h1 className="mt-3 font-heading text-2xl font-extrabold">Forgot password?</h1>
        <p className="page-subtitle !mt-1 !text-sm">Enter your account email — we’ll send a 1-hour reset link.</p>
        {done ? (
          <div className="alert alert-success mt-4">
            <p className="flex items-center gap-2 font-semibold"><MailCheck size={16} /> Check your mail</p>
            <p className="mt-1">If an account exists for this email, a reset link is on its way. It expires in 1 hour.</p>
            <Link to="/login" className="mt-2 inline-block text-accent hover:underline">← Back to login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
            <Link to="/login" className="flex items-center gap-1 text-sm text-text3 hover:underline"><ArrowLeft size={14} /> Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
