import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Wand2, User as UserIcon, ShieldCheck, Save, KeyRound } from 'lucide-react';
import { useCrumbs } from '../crumbs.js';
import api from '../api/client.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default function Profile() {
  const { setCrumbs } = useCrumbs();
  const [me, setMe] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [form, setForm] = useState({ name: me?.name || '', email: me?.email || '' });
  const [perr, setPerr] = useState({});
  const [pok, setPok] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwerr, setPwerr] = useState({});
  const [pwok, setPwok] = useState('');
  const [show, setShow] = useState({ current: false, next: false });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    setCrumbs([{ label: 'Spaces', to: '/' }, { label: 'Profile' }]);
    api.get('/api/auth/me').then((r) => {
      setMe(r.data.user);
      setForm({ name: r.data.user.name || '', email: r.data.user.email || '' });
      localStorage.setItem('user', JSON.stringify(r.data.user));
    }).catch(() => {});
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    else if (form.name.trim().length < 2) errors.name = 'Name needs at least 2 characters';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address';
    setPerr(errors);
    if (Object.keys(errors).length) return;
    setPok('');
    setSaving(true);
    try {
      const { data } = await api.patch('/api/auth/profile', { name: form.name.trim(), email: form.email.trim() });
      localStorage.setItem('user', JSON.stringify(data.user));
      setMe(data.user);
      setPok('Profile updated');
    } catch (err) {
      setPerr({ form: err.response?.data?.error || 'Could not save — try again' });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    const errors = {};
    if (!pw.current) errors.current = 'Enter current password';
    if (!pw.next) errors.next = 'Enter new password';
    else if (pw.next.length < 6) errors.next = 'New password needs at least 6 characters';
    if (pw.next !== pw.confirm) errors.confirm = 'Passwords do not match';
    setPwerr(errors);
    if (Object.keys(errors).length) return;
    setPwok('');
    setChanging(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      setPwok('Password changed successfully');
    } catch (err) {
      setPwerr({ form: err.response?.data?.error || 'Could not change password' });
    } finally {
      setChanging(false);
    }
  }

  const score = pw.next ? strength(pw.next) : 0;

  return (
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container max-w-3xl pt-6">
        <Link to="/" className="text-sm text-text2 hover:underline">← Home</Link>
        <div className="page-header fade-up">
          <h1 className="page-title">Your <span className="hero-gradient-text">profile</span></h1>
          <p className="page-subtitle">Edit details, change password, review your account.</p>
        </div>

        <div className="card fade-up-2">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><UserIcon size={18} className="text-accent" /> Profile details</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">{((me?.name || me?.email) || 'U')[0].toUpperCase()}</span>
            <div>
              <p className="font-semibold">{me?.name}</p>
              <p className="text-sm text-text2">{me?.email} {me?.isAdmin && <span className="badge badge-low ml-1">admin</span>}</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {perr.name && <p className="mt-1 text-xs text-red-600">{perr.name}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {perr.email && <p className="mt-1 text-xs text-red-600">{perr.email}</p>}
            </div>
            <div className="sm:col-span-2">
              <button className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save changes'}</button>
              {pok && <span className="ml-2 text-sm text-green-600">{pok}</span>}
              {perr.form && <span className="ml-2 text-sm text-red-600">{perr.form}</span>}
            </div>
          </form>
        </div>

        <div className="card fade-up-3 mt-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><KeyRound size={18} className="text-accent" /> Change password</h2>
          <form onSubmit={changePassword} className="mt-3 space-y-3" noValidate>
            <div>
              <label className="label">Current password</label>
              <div className="relative">
                <input className="input pr-11" type={show.current ? 'text' : 'password'} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                <button type="button" onClick={() => setShow({ ...show, current: !show.current })} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text3 hover:text-text">{show.current ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {pwerr.current && <p className="mt-1 text-xs text-red-600">{pwerr.current}</p>}
            </div>
            <div>
              <label className="label">New password (min 6)</label>
              <div className="relative">
                <input className="input pr-11" type={show.next ? 'text' : 'password'} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                <button type="button" onClick={() => setShow({ ...show, next: !show.next })} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text3 hover:text-text">{show.next ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {pwerr.next && <p className="mt-1 text-xs text-red-600">{pwerr.next}</p>}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`h-1.5 w-8 rounded ${pw.next && i < score ? (score >= 3 ? 'bg-green-500' : score === 2 ? 'bg-amber-500' : 'bg-red-500') : 'bg-surface'}`} />
                  ))}
                </div>
                <button type="button" onClick={() => setPw({ ...pw, next: suggestPassword(), confirm: '' })} className="inline-flex items-center gap-1 text-xs text-accent hover:underline"><Wand2 size={13} /> Suggest</button>
              </div>
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              {pwerr.confirm && <p className="mt-1 text-xs text-red-600">{pwerr.confirm}</p>}
            </div>
            <div>
              <button className="btn btn-primary" disabled={changing}>{changing ? 'Changing…' : 'Change password'}</button>
              {pwok && <span className="ml-2 text-sm text-green-600">{pwok}</span>}
              {pwerr.form && <span className="ml-2 text-sm text-red-600">{pwerr.form}</span>}
            </div>
          </form>
        </div>

        <div className="card mt-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><ShieldCheck size={18} className="text-accent" /> Account</h2>
          <div className="mt-2 space-y-1 text-sm text-text2">
            <p>Role: <b>{me?.isAdmin ? 'Administrator' : 'Learner'}</b></p>
            <p>Member since: <b>{me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : '—'}</b></p>
          </div>
        </div>
      </div>
    </div>
  );
}
