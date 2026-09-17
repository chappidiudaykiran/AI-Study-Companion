import { Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api/client.js';

function Health() {
  const [status, setStatus] = useState('checking...');
  useEffect(() => {
    api.get('/health').then((r) => setStatus(JSON.stringify(r.data))).catch((e) => setStatus('API offline: ' + e.message));
  }, []);
  return <p style={{ fontSize: 13 }}>Backend: {status}</p>;
}

export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>AI Study Companion (Day 0)</h1>
      <p>Persistent, contextual, measurable learning companion — MERN scaffold OK.</p>
      <nav style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        <Link to="/">Home</Link>
      </nav>
      <Routes>
        <Route path="/" element={<><p>Day 1 next: Auth + Spaces + Projects.</p><Health /></>} />
      </Routes>
    </div>
  );
}
