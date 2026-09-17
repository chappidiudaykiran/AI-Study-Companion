import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'demo@test.com', password: 'demo123' });
  const [err, setErr] = useState('');
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const { data } = await api.post(url, form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/');
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        {mode === 'register' && <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /> }
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
      </form>
      {err && <p style={{ color: 'red' }}>{err}</p>}
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ marginTop: 8 }}>
        Switch to {mode === 'login' ? 'register' : 'login'}
      </button>
      <p><Link to="/">Back</Link></p>
    </div>
  );
}
