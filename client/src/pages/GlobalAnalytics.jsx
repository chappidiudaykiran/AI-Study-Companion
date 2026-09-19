import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { useCrumbs } from '../crumbs.js';
import { PageSkeleton } from '../components/Shimmer.jsx';
import api from '../api/client.js';

export default function GlobalAnalytics() {
  const [g, setG] = useState(null);
  const { setCrumbs } = useCrumbs();

  useEffect(() => {
    setCrumbs([{ label: 'Spaces', to: '/' }, { label: 'Global Analytics' }]);
    api.get('/api/analytics/global').then((r) => setG(r.data)).catch(() => {});
  }, []);

  const trend = useMemo(() => {
    const days = {};
    (g?.recentEvents || []).forEach((e) => {
      const d = new Date(e.at || e.createdAt).toLocaleDateString();
      days[d] = (days[d] || 0) + 1;
    });
    return Object.entries(days).slice(-14).map(([d, n]) => ({ day: d.slice(0, 5), events: n }));
  }, [g]);

  const byType = useMemo(
    () => Object.entries(g?.byType || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    [g]
  );

  if (!g) return <div className="theme-dashboard min-h-screen"><PageSkeleton stats={4} cards={0} /></div>;

  return (
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container pt-6">
        <div className="page-header fade-up">
          <h1 className="page-title">Global <span className="hero-gradient-text">analytics</span></h1>
          <p className="page-subtitle">Aggregated learning activity across all spaces and projects.</p>
        </div>

        <div className="grid-4 fade-up-2">
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.spaces ?? 0}</p><p className="text-sm text-text2">Spaces</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.projectsCount ?? 0}</p><p className="text-sm text-text2">Projects</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.materials ?? 0}</p><p className="text-sm text-text2">Materials</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.tutorAnswers ?? 0}</p><p className="text-sm text-text2">Tutor answers</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.attempts ?? 0}</p><p className="text-sm text-text2">Quiz attempts</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.avgScore ?? 0}%</p><p className="text-sm text-text2">Quiz accuracy</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.masteryAvg ?? 0}%</p><p className="text-sm text-text2">Avg mastery</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.recs ?? 0}</p><p className="text-sm text-text2">Recommendations</p></div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="card">
            <h2 className="font-heading font-bold">Activity by type</h2>
            {byType.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={130} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-text3">No activity yet.</p>}
          </div>
          <div className="card">
            <h2 className="font-heading font-bold">Activity trend (14 days)</h2>
            {trend.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="events" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-text3">No activity yet.</p>}
          </div>
        </div>

        <div className="card mt-5">
          <h2 className="font-heading font-bold">Recent activity</h2>
          <div className="mt-2 max-h-72 space-y-1 overflow-auto text-xs text-text2">
            {(g.recentEvents || []).map((e, i) => <p key={i} className="rounded-lg bg-bg3 px-2 py-1.5"><b>{e.type}</b> · {new Date(e.at || e.createdAt).toLocaleString()} · {JSON.stringify(e.payload || {}).slice(0, 120)}</p>)}
            {!(g.recentEvents || []).length && <p className="text-sm text-text3">Nothing yet.</p>}
          </div>
        </div>

        <div className="card mt-5">
          <h2 className="font-heading font-bold">Concepts needing attention</h2>
          <div className="mt-2 space-y-1 text-sm">
            {(g.attention || []).map((a, i) => (
              <p key={i}><b>{a.concept}</b> {a.score}%{a.projectId && <Link to={`/project/${a.projectId}`} className="ml-1 text-accent hover:underline">({a.project})</Link>}</p>
            ))}
            {!(g.attention || []).length && <p className="text-sm text-text2">All clear.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
