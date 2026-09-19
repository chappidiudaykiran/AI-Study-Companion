import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { UploadCloud, MessagesSquare, ListChecks, TrendingUp, BarChart3, CheckCircle2, Circle, Bot, User as UserIcon, Send, Sparkles, BookOpen, Folder, Target, FileText, Trash2, Layers, RotateCcw, ThumbsUp, ThumbsDown, Wand2, Home as HomeIcon, LayoutDashboard } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import MathText from '../components/MathText.jsx';
import { Skel, TextLines, ChatThread, ListRows, PageSkeleton } from '../components/Shimmer.jsx';
import api from '../api/client.js';
import { useCrumbs } from '../crumbs.js';

const SUGGESTIONS = ['Summarize my document', 'Explain simply with an example', 'Give key definitions', 'What should I revise?'];

const STEPS = [
  { id: 'overview', n: 1, label: 'Overview', icon: HomeIcon, hint: 'Project snapshot' },
  { id: 'materials', n: 2, label: 'Materials', icon: UploadCloud, hint: 'Upload PDF first' },
  { id: 'tutor', n: 3, label: 'AI Tutor', icon: MessagesSquare, hint: 'Ask, get cited answers' },
  { id: 'concepts', n: 4, label: 'Concepts', icon: BookOpen, hint: 'Divided by material' },
  { id: 'quiz', n: 5, label: 'Quiz', icon: ListChecks, hint: 'MCQ + open-ended' },
  { id: 'dashboard', n: 6, label: 'Dashboard', icon: LayoutDashboard, hint: 'This project only' },
  { id: 'analytics', n: 7, label: 'Analytics', icon: BarChart3, hint: 'This project only' },
];

// Sidebar nav (mobile): per-project tools only — dashboard/analytics are project-scoped
const SIDEBAR_NAV = [
  { id: 'overview', label: 'Overview', icon: HomeIcon },
  { id: 'materials', label: 'Materials', icon: Folder },
  { id: 'tutor', label: 'AI Tutor', icon: MessagesSquare, badge: 'AI' },
  { id: 'concepts', label: 'Concepts', icon: BookOpen },
  { id: 'quiz', label: 'Quiz', icon: Target },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const TAB_LABEL = {
  overview: 'Overview',
  tutor: 'AI Tutor',
  materials: 'Materials',
  concepts: 'Concepts',
  quiz: 'Quiz',
  assignments: 'Assignments',
  growth: 'Growth',
  dashboard: 'Dashboard',
  analytics: 'Analytics',
};

// Adaptive recommendation banner — rendered on EVERY tab so the next step
// follows the learner (weakest concept → quiz / flashcards / tutor action).
function AdaptiveBanner({ adaptive, rec, onGo }) {
  const text = adaptive?.current?.text || rec?.text;
  if (!text && !(adaptive?.actions || []).length) return null;
  const actions = (adaptive?.actions || []).slice(0, 3);
  return (
    <div className="card !border-accent/30 !bg-accent/[0.06]">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent"><Sparkles size={13} /> Adaptive next step</p>
      {text && <p className="mt-1 text-sm font-medium">{text}</p>}
      {!!actions.length && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {actions.map((a, i) => (
            <button key={i} onClick={() => onGo(a.tab)} title={a.detail || a.label} className="rounded-full border border-accent/40 bg-bg2 px-2.5 py-1 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white">
              {a.label}
            </button>
          ))}
        </div>
      )}
      {!!adaptive?.weak?.length && (
        <p className="mt-1.5 text-[11px] text-text3">Focus: {adaptive.weak.map((w) => `${w.concept} ${w.score}%`).join(' · ')}{adaptive.dueCards ? ` · ${adaptive.dueCards} cards due` : ''}</p>
      )}
    </div>
  );
}

function initial(name) {
  return (name || 'M').trim().charAt(0).toUpperCase();
}

export default function Project() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const { setCrumbs } = useCrumbs();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [file, setFile] = useState(null);
  const [matStatus, setMatStatus] = useState('');
  const [q, setQ] = useState('');
  const [chat, setChat] = useState([]);
  const [asking, setAsking] = useState(false);
  // Tutor saved chats (left CHATS panel, like screenshot)
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState('default');
  const [chatSearch, setChatSearch] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [chatsCollapsed, setChatsCollapsed] = useState(false);
  const chatBoxRef = useRef(null);
  const quizBoxRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [mastery, setMastery] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [rec, setRec] = useState(null);
  const [adaptive, setAdaptive] = useState(null);
  const [quizTip, setQuizTip] = useState('');
  // Quiz 3-pane (screenshot-style) state
  const [quizSearch, setQuizSearch] = useState('');
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizInput, setQuizInput] = useState('');
  const [answeringId, setAnsweringId] = useState(null);
  const [startingQuiz, setStartingQuiz] = useState(false);
  // In-chat summaries posted by the Summarize chip (built from this chat only)
  const [quizNotes, setQuizNotes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [matsLoading, setMatsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // Flashcards (adaptive drill deck)
  const [cards, setCards] = useState([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [genCards, setGenCards] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat, asking, tab]);

  useEffect(() => {
    quizBoxRef.current?.scrollTo({ top: quizBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [questions, tab]);

  // Tutor + Quiz: freeze page scroll, inner panes scroll instead (like screenshot)
  useEffect(() => {
    if (tab !== 'tutor' && tab !== 'quiz') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [tab]);

  async function loadMaterials() {
    setMatsLoading(true);
    try {
      const { data } = await api.get(`/api/projects/${id}/materials`);
      setMaterials(data.materials || []);
    } catch {} finally {
      setMatsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'materials') loadMaterials();
  }, [tab]);

  async function deleteMaterial(mid, name) {
    if (!window.confirm(`Delete "${name}"? Its chunks and jobs go too. This cannot be undone.`)) return;
    setDeletingId(mid);
    try {
      await api.delete(`/api/materials/${mid}`);
      await loadMaterials();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed — try again');
    } finally {
      setDeletingId(null);
    }
  }

  // Tab switches go through the URL so the global sidebar stays in sync
  const goTab = (t) => {
    setTab(t);
    setSearchParams(t === 'overview' ? {} : { tab: t });
  };

  useEffect(() => {
    localStorage.setItem('lastProjectId', id);
    const t = searchParams.get('tab');
    if (t) setTab(t);
    api.get(`/api/projects/${id}`).then((r) => {
      const p = r.data.project;
      setProject(p);
      const sp = p.space && typeof p.space === 'object' ? p.space : { _id: p.space };
      localStorage.setItem('lastProject', JSON.stringify({ id: p._id, name: p.name, spaceId: sp._id || null, spaceName: sp.name || '' }));
      localStorage.setItem('lastSpace', JSON.stringify({ id: sp._id || null, name: sp.name || '' }));
    }).catch(() => {});
    api.get(`/api/projects/${id}/tutor/sessions`).then((r) => {
      const list = r.data.sessions || [];
      setSessions(list);
      const first = list[0]?.id || 'default';
      setActiveSession(first);
      return api.get(`/api/projects/${id}/tutor/history`, { params: { session: first } });
    }).then((r) => setChat(r?.data?.messages || [])).catch(() => {}).finally(() => setSessionsLoading(false));
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

  useEffect(() => {
    if (!project) return;
    const sp = project.space && typeof project.space === 'object' ? project.space : {};
    setCrumbs([
      { label: 'Spaces', to: '/' },
      ...(sp._id ? [{ label: sp.name || 'Space', to: `/?space=${sp._id}` }] : []),
      { label: project.name },
      { label: TAB_LABEL[tab] || tab },
    ]);
  }, [project, tab]);

  async function refreshStats() {
    try {
      const m = await api.get(`/api/projects/${id}/mastery`);
      setMastery(m.data.mastery || []);
      try {
        const c = await api.get(`/api/projects/${id}/concepts`);
        setConcepts(c.data.concepts || []);
      } catch {}
      const g = await api.get(`/api/projects/${id}/growth`);
      setGrowth(g.data.growth || []);
      const r = await api.get(`/api/projects/${id}/recommendations`);
      setRec(r.data.current);
      const a = await api.get(`/api/projects/${id}/analytics`);
      setAnalytics(a.data);
      try {
        const ad = await api.get(`/api/projects/${id}/adaptive`);
        setAdaptive(ad.data.adaptive || null);
        if (ad.data.adaptive?.current) setRec(ad.data.adaptive.current);
      } catch {}
    } catch {}
  }

  async function loadFlashcards() {
    try {
      const { data } = await api.get(`/api/projects/${id}/flashcards`);
      setCards(data.cards || []);
      setCardIdx(0);
      setFlipped(false);
    } catch {}
  }

  useEffect(() => {
    if (tab === 'flashcards') loadFlashcards();
  }, [tab]);

  const avg = mastery.length ? Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length) : 0;
  const done = {
    overview: true,
    materials: matStatus.includes('ready'),
    tutor: chat.length > 0,
    concepts: mastery.length > 0,
    quiz: questions.length > 0 || (analytics?.attempts || 0) > 0,
    assignments: (analytics?.recentAttempts || []).length > 0,
    growth: growth.length > 0,
    dashboard: (analytics?.attempts || 0) > 0,
    analytics: !!analytics,
  };

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
      setMatStatus(s.data.material.status + (s.data.material.error ? ` — ${s.data.material.error}` : ''));
      if (['ready', 'failed'].includes(s.data.material.status)) { clearInterval(timer); refreshStats(); loadMaterials(); }
    }, 3000);
  }

  async function ask(e) {
    e?.preventDefault();
    await sendText(q);
  }

  async function sendText(text) {
    if (!text.trim() || asking) return;
    const qq = text;
    const sess = activeSession || 'default';
    setQ('');
    setAsking(true);
    setChat((c) => [...c, { role: 'user', text: qq }]);
    try {
      const { data } = await api.post(`/api/projects/${id}/tutor`, { question: qq, session: sess });
      setChat((c) => [...c, { role: 'assistant', text: data.answer, citations: data.citations, grounded: data.grounded }]);
      // refresh saved-chat titles/counts in the background
      api.get(`/api/projects/${id}/tutor/sessions`).then((r) => setSessions(r.data.sessions || [])).catch(() => {});
    } catch (err) {
      setChat((c) => [...c, { role: 'assistant', text: err.response?.data?.error || 'AI unavailable, try again.' }]);
    } finally {
      setAsking(false);
    }
  }

  // ---- Tutor saved chats (CHATS panel) ----
  function newChat() {
    const sid = `s_${Date.now().toString(36)}`;
    setActiveSession(sid);
    setChat([]);
    setQ('');
  }

  async function openSession(sid) {
    if (sid === activeSession || asking) return;
    setActiveSession(sid);
    try {
      const { data } = await api.get(`/api/projects/${id}/tutor/history`, { params: { session: sid } });
      setChat(data.messages || []);
    } catch {}
  }

  async function deleteSession(e, sid) {
    e.stopPropagation();
    if (!window.confirm('Delete this chat?')) return;
    try {
      await api.delete(`/api/projects/${id}/tutor/history`, { params: { session: sid } });
      const { data } = await api.get(`/api/projects/${id}/tutor/sessions`);
      const list = data.sessions || [];
      setSessions(list);
      const next = list[0]?.id || 'default';
      setActiveSession(next);
      const h = await api.get(`/api/projects/${id}/tutor/history`, { params: { session: next } });
      setChat(h.data.messages || []);
    } catch {}
  }

  function copyMsg(i, text) {
    try { navigator.clipboard?.writeText(text); } catch {}
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  function regenerateFrom(idx) {
    // re-ask the user message that precedes assistant message idx
    for (let k = idx - 1; k >= 0; k--) {
      if (chat[k]?.role === 'user') { sendText(chat[k].text); break; }
    }
  }

  function tutorChipAction(chip) {
    if (asking || startingQuiz || genCards) return;
    if (chip === 'Summarize') {
      return sendText('Summarize what we have discussed in this chat in 5-8 short bullet points. Use only our conversation and the project materials.');
    }
    const concept = detectChatConcept();
    if (chip === 'Deep Dive') {
      return sendText(`Explain ${concept || 'the current topic'} deeply, step by step, with examples from my PDFs.`);
    }
    if (chip === 'Generate Quiz') return startTutorQuiz(null);
    if (chip === 'Practice') return startTutorQuiz(concept || undefined);
    if (chip === 'Create Flashcards') return startTutorCards(concept);
  }

  const TUTOR_CHIPS = [
    { label: 'Summarize', icon: FileText },
    { label: 'Deep Dive', icon: BookOpen },
    { label: 'Generate Quiz', icon: ListChecks },
    { label: 'Create Flashcards', icon: Layers },
    { label: 'Practice', icon: Target },
  ];

  // Concept behind the current chat: match the last user message against known
  // concepts, else fall back to the weakest concept.
  function detectChatConcept() {
    const text = [...chat].reverse().find((m) => m.role === 'user')?.text || '';
    const low = text.toLowerCase();
    const names = (concepts.length ? concepts.map((c) => c.name) : mastery.map((m) => m.concept));
    return names.find((n) => n && low.includes(n.toLowerCase())) || adaptive?.weak?.[0]?.concept || '';
  }

  // In-chat quiz widgets (answered inline, never leaves the tutor thread)
  const [tutorQuizzes, setTutorQuizzes] = useState([]);

  async function startTutorQuiz(concept) {
    setStartingQuiz(true);
    try {
      const body = { count: 3 };
      if (concept) body.concept = concept;
      const { data } = await api.post(`/api/projects/${id}/quiz/start`, body);
      setTutorQuizzes((w) => [...w, {
        key: `tq${Date.now()}`,
        concept: concept || 'Adaptive mix',
        questions: (data.questions || []).map((x) => ({ ...x, answer: '', result: null, answering: false })),
      }]);
      refreshStats();
    } finally {
      setStartingQuiz(false);
    }
  }

  async function answerTutorQuiz(wkey, qid, text) {
    const t = (text || '').trim();
    if (!t) return;
    setTutorQuizzes((ws) => ws.map((w) => w.key === wkey
      ? { ...w, questions: w.questions.map((x) => x.id === qid ? { ...x, answer: t, answering: true } : x) }
      : w));
    try {
      const { data } = await api.post(`/api/quiz/${qid}/answer`, { answer: t });
      setTutorQuizzes((ws) => ws.map((w) => w.key === wkey
        ? { ...w, questions: w.questions.map((x) => x.id === qid ? { ...x, result: data, answering: false } : x) }
        : w));
    } catch (err) {
      setTutorQuizzes((ws) => ws.map((w) => w.key === wkey
        ? { ...w, questions: w.questions.map((x) => x.id === qid ? { ...x, answering: false, result: { score: 0, feedback: { text: err.response?.data?.error || 'Grading failed.' } } } : x) }
        : w));
    } finally {
      refreshStats();
    }
  }

  // In-chat flashcard widgets (flip + review inline, deck stays in sync)
  const [tutorCards, setTutorCards] = useState([]);

  async function startTutorCards(concept) {
    setGenCards(true);
    try {
      const body = { count: 6 };
      if (concept) body.concept = concept;
      const { data } = await api.post(`/api/projects/${id}/flashcards/generate`, body);
      await loadFlashcards();
      setTutorCards((w) => [...w, {
        key: `tc${Date.now()}`,
        concept: concept || (data.adaptive?.focus || [])[0] || 'Adaptive',
        cards: (data.cards || []).map((c) => ({ ...c, flipped: false, reviewed: null, msg: '' })),
      }]);
      refreshStats();
    } finally {
      setGenCards(false);
    }
  }

  async function reviewTutorCard(wkey, cardId, known) {
    try {
      const { data } = await api.post(`/api/flashcards/${cardId}/review`, { known });
      setTutorCards((ws) => ws.map((w) => w.key === wkey
        ? { ...w, cards: w.cards.map((c) => c._id === cardId ? { ...c, reviewed: known, msg: data.adaptive?.suggestion || '' } : c) }
        : w));
      refreshStats();
    } catch {}
  }

  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function fmtDay(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return sameDay ? 'Today' : `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
  }
  async function startQuiz(count = 4, concept = null) {
    setStartingQuiz(true);
    try {
      const body = { count };
      if (concept) body.concept = concept;
      const { data } = await api.post(`/api/projects/${id}/quiz/start`, body);
      const qs = data.questions.map((x) => ({ ...x, answer: '', result: null }));
      setQuestions(qs);
      setQuizNotes([]);
      setQuizTip(data.adaptive?.tip || '');
      setActiveQuizId(qs[0]?.id || null);
      setQuizInput('');
    } finally {
      setStartingQuiz(false);
    }
  }

  async function answer(x, overrideText) {
    const text = (overrideText ?? x.answer ?? '').trim();
    if (!text || answeringId) return;
    setAnsweringId(x.id);
    // optimistic: show the typed answer immediately in the thread
    setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: text } : y)));
    try {
      const { data } = await api.post(`/api/quiz/${x.id}/answer`, { answer: text });
      setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: text, result: data } : y)));
    } catch (err) {
      setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, result: { score: 0, feedback: { text: err.response?.data?.error || 'Grading failed — try again.' } } } : y)));
    } finally {
      setAnsweringId(null);
      refreshStats();
    }
  }

  function submitActiveQuiz(e) {
    e?.preventDefault();
    const active = questions.find((v) => v.id === activeQuizId) || questions[0];
    if (!active || !quizInput.trim()) return;
    answer(active, quizInput);
    setQuizInput('');
  }

  // Bottom action row (one line, like the tutor empty-state): every action is
  // built from THIS quiz chat only — active concept, covered concepts, scores.
  const QUIZ_CHIPS = [
    { label: 'Summarize', icon: FileText },
    { label: 'Deep Dive', icon: BookOpen },
    { label: 'Generate Quiz', icon: ListChecks },
    { label: 'Create Flashcards', icon: Layers },
    { label: 'Practice', icon: Target },
  ];

  function activeQuiz() {
    return questions.find((v) => v.id === activeQuizId) || questions[0] || null;
  }

  function summarizeChat() {
    if (!questions.length) return;
    const answered = questions.filter((v) => v.result);
    const byConcept = {};
    for (const v of questions) {
      (byConcept[v.concept] ||= { total: 0, done: 0, sum: 0 });
      byConcept[v.concept].total += 1;
      if (v.result) { byConcept[v.concept].done += 1; byConcept[v.concept].sum += v.result.score || 0; }
    }
    const lines = Object.entries(byConcept).map(([c, s]) =>
      `• ${c}: ${s.done}/${s.total} answered${s.done ? `, avg ${Math.round(s.sum / s.done)}%` : ''}`
    );
    const weak = Object.entries(byConcept)
      .filter(([, s]) => s.done)
      .sort((a, b) => (a[1].sum / a[1].done) - (b[1].sum / b[1].done))[0];
    const text = [
      `Session summary — ${questions.length} questions, ${answered.length} answered.`,
      ...lines,
      weak
        ? `Weakest in this chat: ${weak[0]} (${Math.round(weak[1].sum / weak[1].done)}%). Revise it, then hit Practice.`
        : `Answer the questions above, then hit Practice to drill the weakest one.`,
    ].join('\n');
    setQuizNotes((n) => [...n, { id: `n${Date.now()}`, text }]);
  }

  function quizChipAction(chip) {
    const active = activeQuiz();
    const concept = active?.concept || adaptive?.weak?.[0]?.concept || '';
    if (chip === 'Summarize') return summarizeChat();
    if (chip === 'Generate Quiz') return startQuiz(4);
    if (chip === 'Practice') return startQuiz(4, concept || undefined);
    if (chip === 'Create Flashcards') {
      if (concept) generateFlashcards(concept);
      goTab('flashcards');
      return;
    }
    if (chip === 'Deep Dive') {
      const topic = concept || 'this concept';
      goTab('tutor');
      setTimeout(() => sendText(`Explain ${topic} deeply, step by step, with examples from my PDFs`), 300);
    }
  }

  async function generateFlashcards(focusConcept) {
    setGenCards(true);
    setReviewMsg('');
    try {
      const body = { count: 8 };
      if (focusConcept) body.concept = focusConcept;
      const { data } = await api.post(`/api/projects/${id}/flashcards/generate`, body);
      await loadFlashcards();
      setReviewMsg(data.adaptive?.reason ? `Generated ${data.cards?.length || 0} cards — ${data.adaptive.reason}: ${(data.adaptive.focus || []).join(', ')}` : `Generated ${data.cards?.length || 0} cards.`);
      refreshStats();
    } catch (err) {
      setReviewMsg(err.response?.data?.error || 'Card generation failed — try again.');
    } finally {
      setGenCards(false);
    }
  }

  async function reviewCard(card, known) {
    setReviewMsg('');
    try {
      const { data } = await api.post(`/api/flashcards/${card._id}/review`, { known });
      setReviewMsg(data.adaptive?.suggestion || (known ? 'Marked known.' : 'Marked for review.'));
      setFlipped(false);
      setCardIdx((i) => (cards.length ? (i + 1) % cards.length : 0));
      refreshStats();
      // refresh ordering in background so weak/unknown bubble first
      loadFlashcards();
    } catch (err) {
      setReviewMsg(err.response?.data?.error || 'Review failed — try again.');
    }
  }

  if (!project) return <div className="theme-dashboard min-h-screen"><PageSkeleton /></div>;
  return (
    <div className={`theme-dashboard min-h-screen ${tab === 'tutor' ? 'pb-0' : 'pb-16'}`}>
      {/* In-page nav — mobile only (global sidebar rules on desktop) */}
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-bg2 lg:hidden">
        <Link to="/" className="flex items-center gap-1 px-4 pt-4 text-sm font-medium text-text2 hover:text-text">
          <span aria-hidden>←</span> Back
        </Link>

        <button onClick={() => goTab('overview')} title="Go to overview" className="mx-3 mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-surface">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            {initial(project.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text">{project.name}</span>
            <span className="block truncate text-xs text-text3">{project.goal?.slice(0, 28) || 'project'}</span>
          </span>
        </button>

        <nav className="mt-2 space-y-0.5 px-3 pb-4">
          {SIDEBAR_NAV.map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => goTab(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active ? 'bg-accent/10 font-semibold text-accent' : 'font-medium text-text2 hover:bg-surface hover:text-text'
                }`}
              >
                <Icon size={17} className={active ? 'text-accent' : 'text-text3'} />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="text-[11px] font-bold text-accent">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text3">Avg mastery</p>
          <p className="font-heading text-2xl font-extrabold text-text">{avg}%</p>
          <div className="mt-1 h-2 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{ width: `${avg}%` }} /></div>
          <p className="mt-2 text-[11px] text-text3">Space → Project → Material → Tutor → Quiz → Mastery</p>
        </div>
      </aside>

      {/* Main content — tutor goes edge-to-edge with zero padding */}
      <div className={tab === 'tutor' ? '' : 'container pt-6'}>
        <div className={tab === 'tutor' ? '' : 'mt-3'}>
          {/* Adaptive recommendations — everywhere except overview/growth (own card), tutor (own chips), materials (clean upload view) and concepts (grouped view) */}
          {tab !== 'overview' && tab !== 'growth' && tab !== 'tutor' && tab !== 'materials' && tab !== 'concepts' && (
            <div className="mb-4"><AdaptiveBanner adaptive={adaptive} rec={rec} onGo={goTab} /></div>
          )}
          {tab === 'overview' && (
          <div className="grid-4 fade-up-2">
            <div className="card"><p className="label">Concepts</p><p className="font-heading text-3xl font-extrabold">{mastery.length}</p></div>
            <div className="card"><p className="label">Quiz attempts</p><p className="font-heading text-3xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
            <div className="card"><p className="label">Avg score</p><p className="font-heading text-3xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
            <div className="card"><p className="label">Current section</p><p className="font-heading text-lg font-bold">{TAB_LABEL[tab] || tab}</p></div>
          </div>
          )}

          {tab === 'overview' && (
            <div className="mt-4 space-y-4">
              <div className="card fade-up">
                <h2 className="font-heading text-lg font-bold">Where you stand</h2>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <div><p className="label">Avg mastery</p><p className="font-heading text-2xl font-extrabold">{avg}%</p></div>
                  <div><p className="label">Quiz attempts</p><p className="font-heading text-2xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
                  <div><p className="label">Avg score</p><p className="font-heading text-2xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Learning path</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STEPS.map((s) => (
                    <button key={s.id} onClick={() => goTab(s.id)} className="btn btn-outline !py-1.5 !text-xs">{s.label}</button>
                  ))}
                  <button onClick={() => goTab('concepts')} className="btn btn-outline !py-1.5 !text-xs">Concepts</button>
                  <button onClick={() => goTab('growth')} className="btn btn-outline !py-1.5 !text-xs">Growth</button>
                  <button onClick={() => goTab('assignments')} className="btn btn-outline !py-1.5 !text-xs">Assignments</button>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="card">
                  <h3 className="font-heading font-bold">Important concepts</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    {mastery.slice().sort((a, b) => a.score - b.score).slice(0, 3).map((m) => (
                      <p key={m.concept}>{m.concept}: <b>{m.score}%</b></p>
                    ))}
                    {!mastery.length && <p className="text-sm text-text3">No concepts yet — upload material.</p>}
                  </div>
                  <button onClick={() => goTab('quiz')} className="btn btn-outline mt-2 !py-1.5 !text-xs">Practice → Quiz</button>
                </div>
                <div className="card">
                  <h3 className="font-heading font-bold">Recent activity</h3>
                  <div className="mt-2 space-y-1 text-xs text-text2">
                    {(analytics?.events || []).slice(0, 5).map((e, i) => (
                      <p key={i}><b>{e.type}</b> · {new Date(e.at || e.createdAt).toLocaleString()}</p>
                    ))}
                    {!(analytics?.events || []).length && <p className="text-sm text-text3">Nothing yet.</p>}
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Recommended next step <span className="badge badge-info ml-1">Adaptive</span></h3>
                <p className="alert alert-success mt-2">{adaptive?.current?.text || rec?.text || 'Upload material, then ask the Tutor.'}</p>
                {!!adaptive?.actions?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {adaptive.actions.map((a, i) => (
                      <button key={i} onClick={() => goTab(a.tab)} title={a.detail || a.label} className="btn btn-outline !py-1.5 !text-xs">{a.label} →</button>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => goTab('materials')} className="btn btn-outline !py-1.5 !text-xs">Materials</button>
                  <button onClick={() => goTab('tutor')} className="btn btn-outline !py-1.5 !text-xs">Tutor</button>
                  <button onClick={() => goTab('quiz')} className="btn btn-primary !py-1.5 !text-xs">Adaptive Quiz</button>
                  <button onClick={() => goTab('flashcards')} className="btn btn-outline !py-1.5 !text-xs">Flashcards{adaptive?.dueCards ? ` (${adaptive.dueCards} due)` : ''}</button>
                  <button onClick={() => goTab('dashboard')} className="btn btn-outline !py-1.5 !text-xs">Dashboard</button>
                  <button onClick={() => goTab('analytics')} className="btn btn-outline !py-1.5 !text-xs">Analytics</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'materials' && (
            <form onSubmit={upload} className="card fade-up mt-4">
              <h2 className="font-heading text-lg font-bold">Step 1 — Upload learning material</h2>
              <p className="text-sm text-text2">PDF only, 15MB max. Background: queued → processing → ready. Next: ask the Tutor.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
                <button className="btn btn-primary"><UploadCloud size={16} /> Upload & process</button>
              </div>
              <p className="mt-2 text-sm">Status: <span className={`badge ${matStatus.includes('ready') ? 'badge-low' : matStatus.includes('fail') ? 'badge-high' : 'badge-medium'}`}>{matStatus || 'no upload yet'}</span></p>
              <div className="mt-4">
                <h3 className="font-heading font-bold">Documents in this project</h3>
                <div className="mt-2 space-y-2">
                  {matsLoading && (
                    <div className="space-y-2">
                      {[0, 1].map((i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-bg3 px-3 py-2.5">
                          <div className="flex-1 space-y-1.5"><Skel className="h-3.5 w-2/3" /><Skel className="h-2.5 w-1/3" /></div>
                          <Skel className="h-5 w-16 !rounded-full" />
                        </div>
                      ))}
                    </div>
                  )}
                  {materials.map((m) => (
                    <div key={m._id} className="flex items-center gap-3 rounded-xl border border-border bg-bg3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.filename}</span>
                        <span className="text-xs text-text3">{m.pages || '?'} pages · {new Date(m.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className={`badge ${m.status === 'ready' ? 'badge-low' : m.status === 'failed' ? 'badge-high' : 'badge-medium'}`}>{m.status}</span>
                      <button onClick={() => deleteMaterial(m._id, m.filename)} disabled={deletingId === m._id} title={`Delete ${m.filename}`} className="rounded-lg p-1.5 text-text3 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                        {deletingId === m._id ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border2 border-t-red-600" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  ))}
                  {!materials.length && !matsLoading && <p className="text-sm text-text3">No documents yet.</p>}
                </div>
              </div>
            </form>
          )}

          {tab === 'concepts' && (() => {
            const groups = new Map();
            for (const c of concepts) {
              const key = c.docName || 'Other / earlier uploads';
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key).push(c);
            }
            for (const list of groups.values()) list.sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
            const weakCount = concepts.filter((c) => c.score != null && c.score < 60).length;
            return (
            <div className="mt-4 space-y-3">
              <div className="card fade-up">
                <h2 className="font-heading flex items-center gap-2 text-lg font-bold"><BookOpen size={18} /> Concepts <span className="badge badge-info">{concepts.length}</span></h2>
                <p className="text-sm text-text2">Divided by the material each concept was extracted from — weakest first inside every document.{weakCount > 0 && <b> {weakCount} need repair.</b>}</p>
              </div>
              {[...groups.entries()].map(([doc, list]) => (
                <div key={doc} className="card">
                  <p className="flex items-center gap-2 font-heading font-bold"><FileText size={15} className="text-accent" /><span className="truncate">{doc}</span><span className="badge badge-info ml-auto shrink-0">{list.length}</span></p>
                  <div className="mt-3 space-y-3">
                    {list.map((m) => (
                      <div key={m.name}>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                          <span className="font-medium">{m.name}</span>
                          <span className="flex items-center gap-1.5 text-xs text-text3">
                            {m.status !== 'unattempted' && <span className={`badge ${m.status === 'improving' ? 'badge-low' : m.status === 'needs-attention' ? 'badge-high' : 'badge-medium'}`}>{m.status}</span>}
                            {m.score == null ? 'not attempted' : `${m.score}% · ${m.mistakes} mistakes`}
                          </span>
                        </div>
                        {!!m.description && <p className="mt-0.5 truncate text-xs text-text3">{m.description}</p>}
                        {m.score != null && <div className="mt-1 h-2 rounded bg-surface"><div className={`h-2 rounded ${m.score < 60 ? 'bg-red-500' : m.score < 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${m.score}%` }} /></div>}
                        <div className="mt-1 flex flex-wrap gap-2">
                          <button onClick={() => { sendText(`Explain ${m.name} simply with one example from my PDFs`); goTab('tutor'); }} className="text-[11px] font-semibold text-accent hover:underline">Ask tutor →</button>
                          <button onClick={() => goTab('quiz')} className="text-[11px] font-semibold text-accent hover:underline">Quiz →</button>
                          <button onClick={() => { generateFlashcards(m.name); goTab('flashcards'); }} className="text-[11px] font-semibold text-accent hover:underline">Drill cards →</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!concepts.length && <div className="card text-sm text-text3">No concepts yet — upload a PDF and wait for it to reach <b>ready</b>; concepts divide here per document.</div>}
              {!!concepts.length && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => goTab('quiz')} className="btn btn-primary !py-1.5 !text-xs">Adaptive quiz →</button>
                  <button onClick={() => goTab('flashcards')} className="btn btn-outline !py-1.5 !text-xs">Flashcards →</button>
                </div>
              )}
            </div>
            );
          })()}

          {tab === 'tutor' && (() => {
            const sq = chatSearch.trim().toLowerCase();
            const filteredSessions = !sq ? sessions : sessions.filter((s) => (s.title || '').toLowerCase().includes(sq));
            const today = new Date().toDateString();
            const todayList = filteredSessions.filter((s) => new Date(s.updatedAt).toDateString() === today);
            const earlierList = filteredSessions.filter((s) => new Date(s.updatedAt).toDateString() !== today);
            const lastAssistant = [...chat].reverse().find((m) => m.role === 'assistant' && (m.citations || []).length > 0);
            const lastUserMsg = [...chat].reverse().find((m) => m.role === 'user');
            return (
            <div className="flex h-[calc(100vh-64px)] min-h-[500px] overflow-hidden bg-bg">
              {/* LEFT — CHATS (saved conversations, like screenshot; ‹ collapses) */}
              {!chatsCollapsed ? (
              <div className="flex w-60 shrink-0 flex-col border-r border-border bg-bg2">
                <div className="border-b border-border p-3">
                  <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-text3">Chats <button onClick={() => setChatsCollapsed(true)} title="Collapse chats" className="rounded px-1.5 py-0.5 text-sm leading-none hover:bg-surface hover:text-text">‹</button></p>
                  <button onClick={newChat} className="btn btn-primary w-full !py-2 !text-xs">+ New Chat</button>
                  <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search conversations" className="input mt-2 !py-1.5 !text-xs" />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {!!todayList.length && (
                    <>
                      <p className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-text3">Today</p>
                      <div className="space-y-1">
                        {todayList.map((s) => {
                          const isActive = s.id === activeSession;
                          return (
                            <div key={s.id} onClick={() => openSession(s.id)} className={`group cursor-pointer rounded-xl px-2.5 py-2 transition ${isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
                              <p className="truncate text-xs">{s.title}</p>
                              <p className="mt-0.5 flex items-center justify-between text-[10px] text-text3">
                                <span>{fmtDay(s.updatedAt)} · {s.exchanges} exchange{s.exchanges === 1 ? '' : 's'}</span>
                                <button onClick={(e) => deleteSession(e, s.id)} title="Delete chat" className="hidden rounded p-0.5 hover:text-red-600 group-hover:inline">✕</button>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {!!earlierList.length && (
                    <>
                      <p className="px-1.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-text3">Earlier</p>
                      <div className="space-y-1">
                        {earlierList.map((s) => {
                          const isActive = s.id === activeSession;
                          return (
                            <div key={s.id} onClick={() => openSession(s.id)} className={`group cursor-pointer rounded-xl px-2.5 py-2 transition ${isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
                              <p className="truncate text-xs">{s.title}</p>
                              <p className="mt-0.5 flex items-center justify-between text-[10px] text-text3">
                                <span>{fmtDay(s.updatedAt)} · {s.exchanges} exchange{s.exchanges === 1 ? '' : 's'}</span>
                                <button onClick={(e) => deleteSession(e, s.id)} title="Delete chat" className="hidden rounded p-0.5 hover:text-red-600 group-hover:inline">✕</button>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {!filteredSessions.length && !sessionsLoading && <p className="px-2 py-6 text-center text-xs text-text3">{sessions.length ? 'No match.' : 'No chats yet — start one.'}</p>}
                  {sessionsLoading && <div className="px-1"><ListRows count={4} /></div>}
                </div>
              </div>
              ) : (
              <button onClick={() => setChatsCollapsed(false)} title="Expand chats" className="flex w-8 shrink-0 items-start justify-center border-r border-border bg-bg2 pt-3 text-lg text-text3 transition hover:bg-surface hover:text-text">›</button>
              )}

              {/* CENTER — conversation (like screenshot) */}
              <div className="flex min-w-0 flex-1 flex-col bg-bg">
                <div ref={chatBoxRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="flex gap-2">
                    <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-bg2 px-3.5 py-2.5 text-sm">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-accent">AI Tutor</p>
                      <p className="mt-1">Hello! I&apos;m your AI tutor for this project. I answer only from your uploaded study material, with <b>document and page citations</b> for everything I explain.</p>
                      <p className="mt-1.5 italic text-text2">Try asking me to define a concept, explain how something works, or compare two ideas.</p>
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-green-600"><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" /> Grounded in your project knowledge</p>
                    </div>
                  </div>
                  {chat.map((m, i) => (
                    <div key={i}>
                      {m.role === 'user' ? (
                        <div className="flex justify-end gap-2">
                          <div className="max-w-[80%]">
                            <div className="rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-sm text-white"><p className="whitespace-pre-wrap">{m.text}</p></div>
                            <p className="mt-0.5 text-right text-[10px] text-text3">{fmtTime(m.createdAt) || '02:48'}</p>
                          </div>
                          <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-text2"><UserIcon size={14} /></span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-bg2 px-3.5 py-2.5 text-sm">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-accent">AI Tutor</p>
                            <div className="mt-1"><MathText text={m.text} /></div>
                            {(m.citations || []).map((c, j) => (
                              <p key={j} className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent"><BookOpen size={11} /> {c.doc} · p.{c.page}</p>
                            ))}
                            {m.grounded === false && <p className="badge badge-medium mt-1.5">Not grounded — insufficient evidence</p>}
                            {m.grounded !== false && !(m.citations || []).length && !/AI (temporarily )?unavailable/.test(m.text || '') && (
                              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-green-600"><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" /> Grounded in your project knowledge</p>
                            )}
                            <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-text3">
                              <button onClick={() => copyMsg(i, m.text)} className="hover:text-accent">{copiedIdx === i ? 'Copied ✓' : '⧉ Copy'}</button>
                              <button onClick={() => regenerateFrom(i)} disabled={asking} className="hover:text-accent disabled:opacity-50">↻ Regenerate</button>
                              <button onClick={() => document.getElementById('tutor-input')?.focus()} className="hover:text-accent">Ask follow-up</button>
                            </div>
                            <p className="mt-0.5 text-[10px] text-text3">{fmtTime(m.createdAt) || '02:48'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {tutorQuizzes.map((w) => (
                    <div key={w.key} className="flex gap-2">
                      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                      <div className="max-w-[85%] flex-1 space-y-2 rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/[0.05] px-3.5 py-2.5 text-sm">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">Quiz · {w.concept}</p>
                        {w.questions.map((x) => (
                          <div key={x.id} className="rounded-xl border border-border bg-bg2 p-2.5">
                            <p><span className="badge badge-info mr-1.5">{x.difficulty}</span>{x.stem}</p>
                            {x.type === 'mcq' ? (
                              <div className="mt-1.5 grid gap-1">
                                {x.options.map((o) => (
                                  <button key={o} onClick={() => !x.result && !x.answering && answerTutorQuiz(w.key, x.id, o)} disabled={!!x.result || x.answering} className={`rounded-lg border px-2 py-1.5 text-left text-[13px] transition ${x.result ? 'cursor-default opacity-80' : 'hover:border-accent hover:text-accent'} ${x.answer === o ? 'border-accent bg-accent/10 font-semibold' : 'border-border'}`}>• {o}</button>
                                ))}
                              </div>
                            ) : !x.result ? (
                              <form onSubmit={(e) => { e.preventDefault(); answerTutorQuiz(w.key, x.id, x.answer); }} className="mt-1.5 flex gap-1.5">
                                <input value={x.answer} onChange={(e) => setTutorQuizzes((ws) => ws.map((v) => v.key === w.key ? { ...v, questions: v.questions.map((y) => y.id === x.id ? { ...y, answer: e.target.value } : y) } : v))} placeholder="Type your answer…" className="input flex-1 !py-1.5 !text-xs" />
                                <button className="btn btn-outline !px-3 !py-1.5 !text-xs" disabled={x.answering}>{x.answering ? '…' : 'Send'}</button>
                              </form>
                            ) : null}
                            {x.answer && x.type !== 'mcq' && !x.result && <p className="mt-1 text-xs text-text3">Grading…</p>}
                            {x.result && <p className="mt-1.5 rounded-lg bg-bg3 px-2 py-1.5 text-[13px]"><b>Score {x.result.score}</b> — {x.result.feedback?.text}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {tutorCards.map((w) => (
                    <div key={w.key} className="flex gap-2">
                      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                      <div className="max-w-[85%] flex-1 space-y-2 rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/[0.05] px-3.5 py-2.5 text-sm">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">Flashcards · {w.concept}</p>
                        {w.cards.map((c) => (
                          <div key={c._id} className="rounded-xl border border-border bg-bg2 p-2.5">
                            <button onClick={() => setTutorCards((ws) => ws.map((v) => v.key === w.key ? { ...v, cards: v.cards.map((k) => k._id === c._id ? { ...k, flipped: !k.flipped } : k) } : v))} className="w-full text-left text-[13px] font-semibold">
                              {c.flipped ? c.back : c.front}
                            </button>
                            <p className="mt-0.5 text-[10px] text-text3">{c.flipped ? 'Answer — tap to flip back' : 'Tap to reveal'}</p>
                            {c.reviewed == null ? (
                              <div className="mt-1 flex gap-1.5">
                                <button onClick={() => reviewTutorCard(w.key, c._id, false)} className="btn btn-outline !px-2 !py-1 !text-[11px]">Still learning</button>
                                <button onClick={() => reviewTutorCard(w.key, c._id, true)} className="btn btn-primary !px-2 !py-1 !text-[11px]">I knew it</button>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-text2">{c.reviewed ? 'Marked known ✓' : 'Queued for review'} {c.msg && `— ${c.msg.slice(0, 90)}`}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {asking && (
                    <div className="flex gap-2">
                      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                      <div className="w-3/4 max-w-[85%] space-y-2 rounded-2xl rounded-bl-sm border border-border bg-bg2 p-3">
                        <Skel className="h-3 w-full" />
                        <Skel className="h-3 w-5/6" />
                        <Skel className="h-3 w-2/3" />
                      </div>
                    </div>
                  )}
                  {!chat.length && !asking && (
                    <p className="mx-auto max-w-sm text-center text-xs text-text3">Upload a PDF in Materials first for grounded answers, then try a chip below.</p>
                  )}
                </div>
                <div className="shrink-0 border-t border-border bg-bg2 px-4 py-3">
                  <div className="mb-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                    {TUTOR_CHIPS.map((c) => (
                      <button key={c.label} onClick={() => tutorChipAction(c.label)} disabled={asking || startingQuiz || genCards} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg3 px-3 py-1.5 text-xs font-medium text-text2 hover:border-accent hover:text-accent disabled:opacity-50"><c.icon size={13} /> {c.label}</button>
                    ))}
                  </div>
                  <form onSubmit={ask} className="flex gap-2">
                    <input id="tutor-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lastUserMsg ? 'Ask a follow-up…' : 'Ask anything from your material…'} className="input flex-1" />
                    <button className="btn btn-primary !px-4" disabled={asking}><Send size={16} /></button>
                  </form>
                  <p className="mt-1 text-center text-[10px] text-text3">Answers are generated only from your uploaded study material.</p>
                </div>
              </div>

              {/* RIGHT — Sources (like screenshot) */}
              <div className="hidden w-64 shrink-0 flex-col border-l border-border bg-bg2 md:flex">
                <p className="border-b border-border p-3 text-xs font-bold">Sources <span className="float-right font-normal text-text3">›</span></p>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
                  <div>
                    <p className="text-text3">Referenced in the last response</p>
                    {(lastAssistant?.citations || []).length ? (
                      <div className="mt-1.5 space-y-1.5">
                        {lastAssistant.citations.map((c, j) => (
                          <div key={j} className="rounded-xl border border-border bg-bg3 p-2.5">
                            <p className="flex items-center gap-1 font-semibold text-accent"><BookOpen size={12} /> {c.doc}</p>
                            <p className="mt-0.5 text-text3">Page {c.page}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1.5 rounded-xl border border-dashed border-border2 bg-bg3 p-3 text-text3">
                        Citations from grounded answers will appear here with document name and page number.
                      </div>
                    )}
                  </div>
                  {!!adaptive?.weak?.length && (
                    <div>
                      <p className="font-bold text-text3">Focus next</p>
                      <div className="mt-1 space-y-1">
                        {adaptive.weak.slice(0, 3).map((w) => (
                          <button key={w.concept} onClick={() => sendText(`Explain ${w.concept} simply with one example from my PDFs`)} disabled={asking} className="block w-full truncate rounded-lg bg-bg3 px-2 py-1.5 text-left hover:text-accent disabled:opacity-50">
                            {w.concept} · {w.score}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })()}

          {tab === 'quiz' && (() => {
            const filtered = questions.filter((v) =>
              !quizSearch.trim() ||
              `${v.concept} ${v.stem}`.toLowerCase().includes(quizSearch.trim().toLowerCase())
            );
            const active = questions.find((v) => v.id === activeQuizId) || questions[0] || null;
            const answered = questions.filter((v) => v.result).length;
            return (
            <div className="card fade-up mt-4 flex h-[calc(100vh-230px)] min-h-[540px] !p-0 overflow-hidden">
              {/* LEFT — saved quizzes / new quiz (like CHATS panel in screenshot) */}
              <div className="flex w-60 shrink-0 flex-col border-r border-border bg-bg2">
                <div className="border-b border-border p-3">
                  <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-text3">Quizzes <span className="text-text3">‹</span></p>
                  <button onClick={() => startQuiz(4)} disabled={startingQuiz} className="btn btn-primary w-full !py-2 !text-xs">+ New Quiz</button>
                  <input value={quizSearch} onChange={(e) => setQuizSearch(e.target.value)} placeholder="Search conversations" className="input mt-2 !py-1.5 !text-xs" />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  <p className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-text3">Today</p>
                  <div className="space-y-1">
                    {filtered.map((v) => {
                      const isActive = v.id === active?.id;
                      return (
                        <button key={v.id} onClick={() => { setActiveQuizId(v.id); setQuizInput(v.answer || ''); }} className={`block w-full truncate rounded-xl px-2.5 py-2 text-left transition ${isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
                          <span className="block truncate text-xs">{v.concept}: {v.stem?.slice(0, 42) || 'Question'}</span>
                          <span className="mt-0.5 block text-[10px] text-text3">{v.difficulty} · {v.result ? `scored ${v.result.score}` : '1 exchange'}</span>
                        </button>
                      );
                    })}
                    {!filtered.length && <p className="px-2 py-6 text-center text-xs text-text3">{questions.length ? 'No match.' : 'No quiz yet — start one.'}</p>}
                  </div>
                </div>
                <div className="border-t border-border p-3 text-[11px] text-text3">
                  <p><b className="text-text">{answered}/{questions.length || 0}</b> answered{quizTip ? ` · ${quizTip.slice(0, 60)}` : ''}</p>
                </div>
              </div>

              {/* CENTER — quiz thread (like AI TUTOR conversation in screenshot) */}
              <div className="flex min-w-0 flex-1 flex-col bg-bg">
                <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg3 px-4 py-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white"><ListChecks size={16} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">Adaptive Quiz {active ? `· ${active.concept}` : ''}</p>
                    <p className="truncate text-xs text-text3">Weakest first · difficulty matched to mastery · grounded in your PDFs</p>
                  </div>
                  {!!adaptive?.quizPlan?.length && (
                    <div className="ml-auto hidden gap-1.5 xl:flex">
                      {adaptive.quizPlan.slice(0, 3).map((p) => (
                        <span key={p.concept} title={p.reason} className="badge badge-info !text-[10px]">{p.concept} · {p.difficulty}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div ref={quizBoxRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {!questions.length && !startingQuiz && (
                    <div className="mx-auto mt-10 max-w-sm text-center">
                      <Sparkles size={28} className="mx-auto text-accent" />
                      <p className="mt-2 font-heading font-bold">Start your adaptive quiz</p>
                      <p className="text-sm text-text3">Hit “New Quiz” — questions target your weakest concepts first.</p>
                      <button onClick={() => startQuiz(4)} className="btn btn-primary mx-auto mt-3 !text-xs">+ New Quiz (4 questions)</button>
                    </div>
                  )}
                  {startingQuiz && (
                    <div className="space-y-3">
                      {[0, 1].map((i) => (
                        <div key={i} className="rounded-2xl border border-border bg-bg2 p-3.5">
                          <Skel className="h-3 w-1/3" />
                          <div className="mt-2"><TextLines lines={2} /></div>
                          <Skel className="mt-2 h-9 w-full !rounded-xl" />
                        </div>
                      ))}
                    </div>
                  )}
                  {questions.map((v) => (
                    <div key={v.id} className="space-y-2">
                      <div className="flex gap-2">
                        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Bot size={14} /></span>
                        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-bg2 px-3.5 py-2.5 text-sm">
                          <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-accent"><span className="badge badge-info">{v.concept} · {v.difficulty}</span></p>
                          <MathText text={v.stem} />
                          {!!v.reason && <p className="mt-1 text-[11px] italic text-text3">🎯 {v.reason}</p>}
                          {v.type === 'mcq' && <div className="mt-1.5 space-y-0.5 text-[13px] text-text2">{v.options.map((o) => <p key={o}>• {o}</p>)}</div>}
                          <p className="mt-1.5 text-[10px] text-text3">02:48</p>
                        </div>
                      </div>
                      {(v.answer || v.result) && (
                        <>
                          {v.answer && (
                            <div className="flex justify-end gap-2">
                              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-sm text-white"><p className="whitespace-pre-wrap">{v.answer}</p></div>
                              <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-text2"><UserIcon size={14} /></span>
                            </div>
                          )}
                          {v.result && (
                            <div className="flex gap-2">
                              <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Bot size={14} /></span>
                              <div className="max-w-[85%] space-y-1.5 rounded-2xl rounded-bl-sm border border-border bg-bg2 px-3.5 py-2.5 text-sm">
                                <p><b>Score {v.result.score}</b> — {v.result.feedback?.text}</p>
                                {!!v.result.adaptive?.suggestion && <p className="rounded-xl bg-accent/10 px-2.5 py-1.5 text-[13px] font-medium text-accent">➜ Next: {v.result.adaptive.suggestion}</p>}
                                {!!v.result.adaptive?.recommendation && <p className="text-xs text-text2">💡 {v.result.adaptive.recommendation}</p>}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {quizNotes.map((note) => (
                    <div key={note.id} className="flex gap-2">
                      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Bot size={14} /></span>
                      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/[0.06] px-3.5 py-2.5 text-sm">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">Session summary</p>
                        <p className="whitespace-pre-wrap">{note.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="shrink-0 border-t border-border bg-bg2 px-4 py-3">
                  <div className="mb-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                    {QUIZ_CHIPS.map((c) => (
                      <button key={c.label} onClick={() => quizChipAction(c.label)} disabled={startingQuiz || !!answeringId} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg3 px-3 py-1.5 text-xs font-medium text-text2 hover:border-accent hover:text-accent disabled:opacity-50"><c.icon size={13} /> {c.label}</button>
                    ))}
                  </div>
                  <form onSubmit={submitActiveQuiz} className="flex gap-2">
                    <input value={quizInput} onChange={(e) => setQuizInput(e.target.value)} placeholder={active ? `Answer ${active.concept}… (Enter to submit)` : 'Start a quiz first…'} disabled={!active || !!answeringId} className="input flex-1" />
                    <button className="btn btn-primary !px-4" disabled={!active || !!answeringId}><Send size={16} /></button>
                  </form>
                  <p className="mt-1 text-center text-[10px] text-text3">Answers are graded against your uploaded study material.</p>
                </div>
              </div>

              {/* RIGHT — sources / adaptive (like Sources panel in screenshot) */}
              <div className="hidden w-64 shrink-0 flex-col border-l border-border bg-bg2 md:flex">
                <p className="border-b border-border p-3 text-xs font-bold">Sources <span className="float-right font-normal text-text3">›</span></p>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
                  <div>
                    <p className="font-bold text-text3">Referenced in the last response</p>
                    {active ? (
                      <div className="mt-1.5 rounded-xl border border-border bg-bg3 p-2.5">
                        <p className="font-semibold">{active.concept} · {active.difficulty}</p>
                        <p className="mt-0.5 text-text3">{active.reason || 'Adaptive pick'}</p>
                        <p className="mt-1 line-clamp-3 text-text2">{active.stem}</p>
                      </div>
                    ) : <p className="mt-1 text-text3">Start a quiz — concept evidence appears here.</p>}
                  </div>
                  <div>
                    <p className="font-bold text-text3">Adaptive next step</p>
                    <p className="mt-1 rounded-xl bg-accent/10 p-2.5 font-medium text-accent">{adaptive?.current?.text || rec?.text || 'Take a quiz to personalize.'}</p>
                    {!!adaptive?.actions?.length && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {adaptive.actions.slice(0, 3).map((a, i) => (
                          <button key={i} onClick={() => goTab(a.tab)} className="rounded-full border border-accent/40 px-2 py-0.5 font-semibold text-accent hover:bg-accent hover:text-white">{a.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-text3">Mastery</p>
                    <div className="mt-1 space-y-1.5">
                      {mastery.slice().sort((a, b) => a.score - b.score).slice(0, 5).map((m) => (
                        <div key={m.concept}>
                          <div className="flex justify-between"><span className="font-medium">{m.concept}</span><span>{m.score}%</span></div>
                          <div className="h-1.5 rounded bg-surface"><div className="h-1.5 rounded bg-accent" style={{ width: `${m.score}%` }} /></div>
                        </div>
                      ))}
                      {!mastery.length && <p className="text-text3">No mastery yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {tab === 'flashcards' && (
            <div className="mt-4 space-y-3">
              <div className="card fade-up">
                <h2 className="font-heading flex items-center gap-2 text-lg font-bold"><Layers size={18} /> Adaptive flashcards</h2>
                <p className="text-sm text-text2">Unknown cards first → weakest concepts → least-recently-seen. Self-review nudges mastery (±4). Weakest concept is auto-focused on generate.</p>
                {!!adaptive?.flashcardFocus?.length && (
                  <p className="mt-1 text-xs text-text3">Focus now: {adaptive.flashcardFocus.map((f) => `${f.concept} ${f.score}%`).join(' · ')}{adaptive.dueCards ? ` · ${adaptive.dueCards} due` : ''}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => generateFlashcards()} disabled={genCards} className="btn btn-primary !py-1.5 !text-xs"><Wand2 size={14} /> {genCards ? 'Generating…' : `Generate adaptive deck${adaptive?.weak?.[0] ? `: ${adaptive.weak[0].concept}` : ''}`}</button>
                  {!!adaptive?.weak?.[0] && (
                    <button onClick={() => generateFlashcards(adaptive.weak[0].concept)} disabled={genCards} className="btn btn-outline !py-1.5 !text-xs">Only {adaptive.weak[0].concept}</button>
                  )}
                  <button onClick={loadFlashcards} className="btn btn-outline !py-1.5 !text-xs"><RotateCcw size={13} /> Reload order</button>
                </div>
                {!!reviewMsg && <p className="alert alert-info mt-2 !mb-0">{reviewMsg}</p>}
              </div>
              {genCards && (
                <div className="card text-center">
                  <Skel className="mx-auto h-4 w-48" />
                  <Skel className="mx-auto mt-3 min-h-[140px] w-full !rounded-2xl" />
                  <div className="mx-auto mt-3 flex max-w-xs justify-center gap-2">
                    <Skel className="h-8 flex-1 !rounded-[10px]" />
                    <Skel className="h-8 flex-1 !rounded-[10px]" />
                  </div>
                </div>
              )}
              {cards.length ? (
                <div className="card text-center">
                  <p className="text-xs text-text3">Card {cardIdx + 1} of {cards.length} · <span className="badge badge-info ml-1">{cards[cardIdx]?.concept} · {cards[cardIdx]?.difficulty}</span>{cards[cardIdx]?.known === false && <span className="badge badge-high ml-1">needs review</span>}</p>
                  <button onClick={() => setFlipped((f) => !f)} className="mt-2 min-h-[140px] w-full rounded-2xl border border-border bg-bg3 p-6 text-lg font-semibold transition hover:border-accent" title="Click to flip">
                    {flipped ? cards[cardIdx]?.back : cards[cardIdx]?.front}
                  </button>
                  <p className="mt-1 text-[11px] text-text3">{flipped ? 'Answer — click to see prompt' : 'Prompt — click to reveal answer'}</p>
                  <div className="mt-3 flex justify-center gap-2">
                    <button onClick={() => setFlipped((f) => !f)} className="btn btn-outline !py-1.5 !text-xs"><RotateCcw size={13} /> Flip</button>
                    <button onClick={() => reviewCard(cards[cardIdx], false)} className="btn btn-outline !py-1.5 !text-xs !text-red-600"><ThumbsDown size={14} /> Still learning</button>
                    <button onClick={() => reviewCard(cards[cardIdx], true)} className="btn btn-primary !py-1.5 !text-xs"><ThumbsUp size={14} /> I knew it</button>
                  </div>
                  <div className="mt-2 flex justify-center gap-1.5">
                    <button onClick={() => { setCardIdx((i) => (i - 1 + cards.length) % cards.length); setFlipped(false); }} className="btn btn-outline !px-3 !py-1 !text-xs">← Prev</button>
                    <button onClick={() => { setCardIdx((i) => (i + 1) % cards.length); setFlipped(false); }} className="btn btn-outline !px-3 !py-1 !text-xs">Next →</button>
                  </div>
                </div>
              ) : !genCards && (
                <div className="card text-sm text-text3">No flashcards yet — generate your first adaptive deck above.</div>
              )}
              {!!cards.length && (
                <div className="card">
                  <h3 className="font-heading font-bold">Deck order (adaptive)</h3>
                  <div className="mt-2 max-h-56 space-y-1 overflow-auto text-xs">
                    {cards.slice(0, 20).map((c, i) => (
                      <button key={c._id} onClick={() => { setCardIdx(i); setFlipped(false); }} className={`block w-full truncate rounded-lg px-2 py-1.5 text-left ${i === cardIdx ? 'bg-accent/10 font-bold text-accent' : 'bg-bg3 text-text2 hover:text-text'}`}>
                        {i + 1}. [{c.concept}] {c.front?.slice(0, 80)}{c.known === false ? ' · needs review' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'assignments' && (
            <div className="mt-4 space-y-3">
              <div className="card fade-up">
                <h2 className="font-heading text-lg font-bold">Assignments</h2>
                <p className="text-sm text-text2">Your recent quiz attempts as assignments. Submit new ones from the Quiz tab.</p>
                <button onClick={() => goTab('quiz')} className="btn btn-primary mt-2 !py-1.5 !text-xs">Go to Quiz →</button>
              </div>
              {(analytics?.recentAttempts || []).map((a, i) => (
                <div key={i} className="card">
                  <p className="text-sm font-semibold">Attempt #{(analytics.recentAttempts.length - i)} — Score {a.score}%</p>
                  <p className="text-xs text-text3">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p>
                </div>
              ))}
              {!(analytics?.recentAttempts || []).length && <div className="card text-sm text-text3">No assignments yet — start a quiz.</div>}
            </div>
          )}

          {tab === 'growth' && (
            <div className="mt-4 space-y-3">
              <AdaptiveBanner adaptive={adaptive} rec={rec} onGo={goTab} />
              <div className="card fade-up">
              <h2 className="font-heading text-lg font-bold">Growth & next step</h2>
              <div className="mt-2 space-y-1 text-sm">
                {growth.map((g) => (
                  <p key={g.concept}>{g.concept}: {g.score}% <span className={`badge ml-1 ${g.status === 'improving' ? 'badge-low' : g.status === 'needs-attention' ? 'badge-high' : 'badge-medium'}`}>{g.status} Δ{g.delta}</span></p>
                ))}
                {!growth.length && <p className="text-sm text-text3">No growth data yet.</p>}
              </div>
              <h3 className="mt-4 font-heading font-bold">What should you do next?</h3>
              <p className="alert alert-success mt-2">{adaptive?.current?.text || rec?.text || 'Take a quiz to generate recommendations.'}</p>
              {!!adaptive?.tutorPrompts?.length && (
                <div className="mt-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-text3">Adaptive tutor prompts</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {adaptive.tutorPrompts.map((t) => (
                      <button key={t.concept} onClick={() => { goTab('tutor'); setTimeout(() => sendText(t.prompt), 300); }} title={t.prompt} className="rounded-full border border-border bg-bg3 px-2.5 py-1 text-xs hover:border-accent hover:text-accent">Ask: {t.concept}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={refreshStats} className="btn btn-outline !py-1.5">Refresh stats</button>
                <button onClick={() => goTab('quiz')} className="btn btn-primary !py-1.5 !text-xs">Adaptive quiz →</button>
                <button onClick={() => goTab('flashcards')} className="btn btn-outline !py-1.5 !text-xs">Flashcards →</button>
              </div>
              </div>
            </div>
          )}

          {tab === 'dashboard' && (
            <div className="mt-4 space-y-4">
              <div className="grid-4 fade-up">
                <div className="card"><p className="label">Avg mastery · this project</p><p className="font-heading text-3xl font-extrabold">{avg}%</p><p className="text-xs text-text3">{mastery.length} concepts tracked</p></div>
                <div className="card"><p className="label">Quiz attempts · this project</p><p className="font-heading text-3xl font-extrabold">{analytics?.attempts ?? 0}</p><p className="text-xs text-text3">avg score {analytics?.avgScore ?? 0}%</p></div>
                <div className="card"><p className="label">Flashcards due</p><p className="font-heading text-3xl font-extrabold">{adaptive?.dueCards ?? cards.length}</p><p className="text-xs text-text3">{cards.length} cards in deck</p></div>
                <div className="card"><p className="label">Tutor exchanges</p><p className="font-heading text-3xl font-extrabold">{chat.length}</p><p className="text-xs text-text3">{sessions.length} saved chats</p></div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Mastery snapshot</h3>
                  {mastery.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mastery.slice().sort((a, b) => a.score - b.score).slice(0, 8).map((m) => ({ name: m.concept.slice(0, 12), score: m.score }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} dy={8} height={50} />
                        <YAxis domain={[0, 100]} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="score" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-text3">Take a quiz to see mastery bars.</p>}
                </div>
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Needs attention <span className="text-xs font-normal text-text3">weakest in this project</span></h3>
                  <div className="mt-2 space-y-2">
                    {mastery.slice().sort((a, b) => a.score - b.score).slice(0, 3).map((m) => (
                      <div key={m.concept} className="rounded-xl border border-border bg-bg3 px-3 py-2">
                        <div className="flex justify-between text-sm"><span className="font-semibold">{m.concept}</span><span>{m.score}% · {m.mistakes}✕</span></div>
                        <div className="mt-1 h-1.5 rounded bg-surface"><div className="h-1.5 rounded bg-red-500" style={{ width: `${m.score}%` }} /></div>
                        <div className="mt-1.5 flex gap-1.5">
                          <button onClick={() => goTab('quiz')} className="text-[11px] font-semibold text-accent hover:underline">Quiz →</button>
                          <button onClick={() => { generateFlashcards(m.concept); goTab('flashcards'); }} className="text-[11px] font-semibold text-accent hover:underline">Drill cards →</button>
                          <button onClick={() => { goTab('tutor'); setTimeout(() => sendText(`Explain ${m.concept} simply with one example from my PDFs`), 300); }} className="text-[11px] font-semibold text-accent hover:underline">Ask tutor →</button>
                        </div>
                      </div>
                    ))}
                    {!mastery.length && <p className="text-sm text-text3">Upload material and take a quiz — weak spots appear here.</p>}
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Recommended next step <span className="badge badge-info ml-1">Adaptive</span></h3>
                <p className="alert alert-success mt-2">{adaptive?.current?.text || rec?.text || 'Upload material, then ask the Tutor.'}</p>
                {!!adaptive?.actions?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {adaptive.actions.map((a, i) => (
                      <button key={i} onClick={() => goTab(a.tab)} title={a.detail || a.label} className="btn btn-outline !py-1.5 !text-xs">{a.label} →</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Recent activity · this project</h3>
                <div className="mt-2 space-y-1 text-xs text-text2">
                  {(analytics?.events || []).slice(0, 6).map((e, i) => (
                    <p key={i} className="rounded-lg bg-bg3 px-2 py-1.5"><b>{e.type}</b> · {new Date(e.at || e.createdAt).toLocaleString()}</p>
                  ))}
                  {!(analytics?.events || []).length && <p className="text-sm text-text3">Nothing yet in this project.</p>}
                </div>
                <button onClick={() => goTab('analytics')} className="btn btn-outline mt-2 !py-1.5 !text-xs">Full project analytics →</button>
              </div>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="mt-4 space-y-4">
              <div className="grid-4 fade-up">
                <div className="card"><p className="label">Attempts</p><p className="font-heading text-3xl font-extrabold">{analytics?.attempts ?? 0}</p></div>
                <div className="card"><p className="label">Avg score</p><p className="font-heading text-3xl font-extrabold">{analytics?.avgScore ?? 0}%</p></div>
                <div className="card"><p className="label">Concepts tracked</p><p className="font-heading text-3xl font-extrabold">{mastery.length}</p></div>
                <div className="card"><p className="label">Events logged</p><p className="font-heading text-3xl font-extrabold">{analytics?.events?.length ?? 0}</p></div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Mastery by concept</h3>
                  {mastery.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={mastery.map((m) => ({ name: m.concept.slice(0, 12), score: m.score }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} dy={8} height={50} />
                        <YAxis domain={[0, 100]} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="score" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-text3">Take a quiz to see mastery bars.</p>}
                </div>
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Score trend (recent attempts)</h3>
                  {(analytics?.recentAttempts || []).length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={analytics.recentAttempts.map((a, i) => ({ n: i + 1, score: a.score }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="n" fontSize={11} label={{ value: 'attempt', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                        <YAxis domain={[0, 100]} fontSize={11} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-text3">No attempts yet — trend appears after quizzes.</p>}
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Recent activity</h3>
                <div className="mt-2 max-h-56 space-y-1 overflow-auto text-xs text-text2">
                  {(analytics?.events || []).slice(0, 15).map((e, i) => (
                    <p key={i} className="rounded-lg bg-bg3 px-2 py-1.5"><b>{e.type}</b> · {new Date(e.at || e.createdAt).toLocaleString()} · {JSON.stringify(e.payload || {}).slice(0, 100)}</p>
                  ))}
                  {!(analytics?.events || []).length && <p className="text-sm text-text3">No activity logged yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step checklist — hidden on the full-bleed tutor pane so it uses all space */}
          {tab !== 'tutor' && (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-text3">
            {STEPS.map((s) => (
              <button key={s.id} onClick={() => goTab(s.id)} className="inline-flex items-center gap-1 rounded-full border border-border bg-bg2 px-2.5 py-1 hover:border-accent hover:text-accent">
                {done[s.id] ? <CheckCircle2 size={11} className="text-green-600" /> : <Circle size={11} />}
                {s.label}
              </button>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
