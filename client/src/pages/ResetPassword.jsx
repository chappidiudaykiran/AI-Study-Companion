import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { BrainCircuit, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from '../api/client.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ next: '', confirm: '' });
  const [err, setErr] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const errors = {};
    if (!token) errors.form = 'Missing reset token — open the link from your mail again';
    if (!form.next) errors.next = 'Enter new password';
    else if (form.next.length < 6) errors.next = 'New password needs at least 6 characters';
    if (form.next !== form.confirm) errors.confirm = 'Passwords do not match';
    setErr(errors);
    if (Object.keys(errors).length) return;
    setServerErr('');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: form.next });
      setDone(true);
      setTimeout(() => nav('/login'), 2500);
    } catch (err) {
      setServerErr(err.response?.data?.error || 'Could not reset — link may be expired');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="theme-auth flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fade-up w-full max-w-md rounded-3xl border border-border bg-bg2 p-5 shadow-xl sm:p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white"><BrainCircuit /></span>
        <h1 className="mt-3 font-heading text-2xl font-extrabold">Set new password</h1>
        {done ? (
          <p className="alert alert-success mt-4 flex items-center gap-2"><CheckCircle2 size={16} /> Password reset! Taking you to login…</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
            <div>
              <label className="label">New password (min 6)</label>
              <div className="relative">
                <input className="input pr-11" type={show ? 'text' : 'password'} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text3 hover:text-text">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {err.next && <p className="mt-1 text-xs text-red-600">{err.next}</p>}
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              {err.confirm && <p className="mt-1 text-xs text-red-600">{err.confirm}</p>}
            </div>
            {(err.form || serverErr) && <p className="text-xs text-red-600">{err.form || serverErr}</p>}
            <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Resetting…' : 'Reset password'}</button>
            <Link to="/login" className="block text-sm text-text3 hover:underline">← Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
