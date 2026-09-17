import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Project() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('tutor');
  const [file, setFile] = useState(null);
  const [matStatus, setMatStatus] = useState('');
  const [q, setQ] = useState('');
  const [chat, setChat] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [mastery, setMastery] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [rec, setRec] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get(`/api/projects/${id}`).then((r) => setProject(r.data.project)).catch(() => {});
    api.get(`/api/projects/${id}/tutor/history`).then((r) => setChat(r.data.messages || [])).catch(() => {});
    refreshStats();
  }, [id]);

  async function refreshStats() {
    try {
      const m = await api.get(`/api/projects/${id}/mastery`);
      setMastery(m.data.mastery || []);
      const g = await api.get(`/api/projects/${id}/growth`);
      setGrowth(g.data.growth || []);
      const r = await api.get(`/api/projects/${id}/recommendations`);
      setRec(r.data.current);
      const a = await api.get(`/api/projects/${id}/analytics`);
      setAnalytics(a.data);
    } catch {}
  }

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('pdf', file);
    setMatStatus('uploading...');
    const { data } = await api.post(`/api/projects/${id}/materials`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const mid = data.material._id;
    setMatStatus('queued...');
    const timer = setInterval(async () => {
      const s = await api.get(`/api/materials/${mid}/status`);
      setMatStatus(s.data.material.status);
      if (['ready', 'failed'].includes(s.data.material.status)) clearInterval(timer);
    }, 3000);
  }

  async function ask(e) {
    e.preventDefault();
    if (!q.trim()) return;
    const qq = q;
    setQ('');
    setChat((c) => [...c, { role: 'user', text: qq }]);
    const { data } = await api.post(`/api/projects/${id}/tutor`, { question: qq });
    setChat((c) => [...c, { role: 'assistant', text: data.answer, citations: data.citations }]);
  }

  async function startQuiz() {
    const { data } = await api.post(`/api/projects/${id}/quiz/start`, { count: 4 });
    setQuestions(data.questions.map((x) => ({ ...x, answer: '', result: null })));
  }

  async function answer(x) {
    const { data } = await api.post(`/api/quiz/${x.id}/answer`, { answer: x.answer });
    setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, result: data } : y)));
    refreshStats();
  }

  if (!project) return <p>Loading... <Link to="/">Home</Link></p>;
  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Link to="/">← Home</Link>
      <h2>{project.name}</h2>
      <p>Goal: {project.goal}</p>
      <nav style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {['materials', 'tutor', 'quiz', 'growth', 'analytics'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ fontWeight: tab === t ? 'bold' : 'normal' }}>{t}</button>
        ))}
      </nav>

      {tab === 'materials' && (
        <form onSubmit={upload}>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
          <button>Upload PDF</button>
          <p>Status: {matStatus}</p>
        </form>
      )}

      {tab === 'tutor' && (
        <>
          <form onSubmit={ask} style={{ display: 'flex', gap: 8 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask from your materials..." style={{ flex: 1 }} />
            <button>Ask</button>
          </form>
          {chat.map((m, i) => (
            <div key={i} style={{ border: '1px solid #eee', padding: 8, marginTop: 6 }}>
              <b>{m.role}:</b> {m.text}
              {(m.citations || []).map((c, j) => (
                <div key={j} style={{ fontSize: 12, color: 'green' }}>Source: {c.doc} — Page {c.page}</div>
              ))}
            </div>
          ))}
        </>
      )}

      {tab === 'quiz' && (
        <>
          <button onClick={startQuiz}>Start adaptive quiz (4)</button>
          {questions.map((x) => (
            <div key={x.id} style={{ border: '1px solid #ddd', padding: 8, marginTop: 8 }}>
              <p><b>[{x.concept}/{x.difficulty}]</b> {x.stem}</p>
              {x.type === 'mcq' && x.options.map((o) => <div key={o}>{o}</div>)}
              <input value={x.answer} onChange={(e) => setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: e.target.value } : y)))} placeholder="Your answer" style={{ width: '70%' }} />
              <button onClick={() => answer(x)}>Submit</button>
              {x.result && <p>Score: {x.result.score} — {x.result.feedback?.text}</p>}
            </div>
          ))}
          <h3>Mastery</h3>
          {mastery.map((m) => <div key={m.concept}>{m.concept}: {m.score}% (mistakes {m.mistakes})</div>)}
        </>
      )}

      {tab === 'growth' && (
        <>
          {growth.map((g) => <div key={g.concept}>{g.concept}: {g.score}% [{g.status}, Δ{g.delta}]</div>)}
          <h3>Next step</h3>
          <p>{rec?.text}</p>
          <button onClick={refreshStats}>Refresh</button>
        </>
      )}

      {tab === 'analytics' && (
        <pre style={{ fontSize: 12 }}>{JSON.stringify(analytics, null, 2)}</pre>
      )}
    </div>
  );
}
