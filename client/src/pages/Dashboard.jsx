import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useCrumbs } from '../crumbs.js';
import { PageSkeleton } from '../components/Shimmer.jsx';
import api from '../api/client.js';

export default function Dashboard() {
  const [g, setG] = useState(null);
  const { setCrumbs } = useCrumbs();

  useEffect(() => {
    setCrumbs([{ label: 'Spaces', to: '/' }, { label: 'Dashboard' }]);
    api.get('/api/analytics/global').then((r) => setG(r.data)).catch(() => {});
  }, []);

  if (!g) return <div className="theme-dashboard min-h-screen"><PageSkeleton stats={4} cards={2} /></div>;

  const steps = [
    { label: 'Spaces', value: g.spaces ?? 0, done: (g.spaces ?? 0) > 0 },
    { label: 'Projects', value: g.projectsCount ?? 0, done: (g.projectsCount ?? 0) > 0 },
    { label: 'Materials', value: g.materials ?? 0, done: (g.materials ?? 0) > 0 },
    { label: 'Tutor', value: g.tutorAnswers ?? 0, done: (g.tutorAnswers ?? 0) > 0 },
    { label: 'Quiz', value: g.quizCount ?? 0, done: (g.quizCount ?? 0) > 0 },
    { label: 'Mastery', value: `${g.masteryAvg ?? 0}%`, done: (g.masteryAvg ?? 0) > 0 },
    { label: 'Growth', value: g.recs ?? 0, done: (g.recs ?? 0) > 0 },
    { label: 'Recommendations', value: g.recs ?? 0, done: (g.recs ?? 0) > 0 },
  ];
  const cont = (g.recentProjects || [])[0];

  return (
    <div className="theme-dashboard min-h-screen pb-16">
      <div className="container pt-6">
        <div className="page-header fade-up">
          <h1 className="page-title">Learning <span className="hero-gradient-text">dashboard</span></h1>
          <p className="page-subtitle">Your loop progress, where to continue, and what needs attention.</p>
        </div>

        <div className="grid-4 fade-up-2">
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.projectsCount ?? 0}</p><p className="text-sm text-text2">Projects</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.masteryAvg ?? 0}%</p><p className="text-sm text-text2">Avg mastery</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.avgScore ?? 0}%</p><p className="text-sm text-text2">Quiz accuracy</p></div>
          <div className="card"><p className="font-heading text-3xl font-extrabold">{g.attempts ?? 0}</p><p className="text-sm text-text2">Quiz attempts</p></div>
        </div>

        <div className="card fade-up-3 mt-5">
          <p className="label">Your learning loop</p>
          <div className="mt-2 flex items-start gap-1 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <div key={s.label} className="flex min-w-[86px] flex-1 flex-col items-center text-center">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${s.done ? 'bg-accent text-white' : 'bg-surface text-text3'}`}>
                  {s.done ? <Check size={16} /> : i + 1}
                </span>
                <span className="mt-1 text-xs font-semibold">{s.label}</span>
                <span className="text-xs text-text3">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-5">
          <div className="rounded-2xl bg-gradient-to-br from-accent to-accent2 p-6 text-white md:col-span-3">
            <p className="label !text-white/70">Continue learning</p>
            {cont ? (
              <>
                <p className="mt-1 font-heading text-2xl font-extrabold">Continue: {cont.name}</p>
                <p className="text-sm text-white/85">Pick up in {cont.space} — ask the tutor or take a quiz.</p>
                <Link to={`/project/${cont.id}`} className="btn mt-3 bg-white font-semibold !text-accent hover:brightness-95">Open project →</Link>
              </>
            ) : (
              <>
                <p className="mt-1 font-heading text-2xl font-extrabold">Start your first project</p>
                <p className="text-sm text-white/85">Create a space, add a project, upload a PDF.</p>
                <Link to="/" className="btn mt-3 bg-white font-semibold !text-accent hover:brightness-95">Go to spaces →</Link>
              </>
            )}
          </div>
          <div className="card md:col-span-2">
            <p className="label">Recommended next action</p>
            {g.nextAction ? (
              <>
                <p className="mt-1 text-sm">{g.nextAction.text}</p>
                {g.nextAction.projectId && <Link to={`/project/${g.nextAction.projectId}`} className="mt-1 inline-block text-sm text-accent hover:underline">Open {g.nextAction.project} →</Link>}
              </>
            ) : <p className="mt-1 text-sm text-text2">Nothing urgent — keep learning. Your next recommendation will appear here.</p>}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="card">
            <h2 className="font-heading font-bold">Recent projects</h2>
            <div className="mt-2 space-y-1 text-sm">
              {(g.recentProjects || []).map((p) => (
                <Link key={p.id} to={`/project/${p.id}`} className="block rounded-lg px-2 py-1.5 hover:bg-surface">
                  <span className="font-semibold text-accent">{p.name}</span> <span className="text-xs text-text3">{p.space}</span>
                </Link>
              ))}
              {!(g.recentProjects || []).length && <p className="text-sm text-text3">No projects yet.</p>}
            </div>
          </div>
          <div className="card">
            <h2 className="font-heading font-bold">Areas requiring attention</h2>
            <div className="mt-2 space-y-1 text-sm">
              {(g.attention || []).map((a, i) => (
                <p key={i}><b>{a.concept}</b> {a.score}%{a.projectId && <Link to={`/project/${a.projectId}`} className="ml-1 text-accent hover:underline">({a.project})</Link>}</p>
              ))}
              {!(g.attention || []).length && <p className="text-sm text-text2">Nothing below 60% mastery. Nice work.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
