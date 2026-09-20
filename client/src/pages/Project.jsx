import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { UploadCloud, MessagesSquare, ListChecks, BarChart3, CheckCircle2, Circle, Bot, User as UserIcon, Send, Sparkles, Compass, BookOpen, Folder, Target, FileText, Trash2, Layers, Home as HomeIcon, LayoutDashboard, PenLine } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Cell } from 'recharts';
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
  { id: 'practice', n: 6, label: 'Practice', icon: PenLine, hint: 'Exam-style paper' },
  { id: 'dashboard', n: 7, label: 'Dashboard', icon: LayoutDashboard, hint: 'This project only' },
  { id: 'analytics', n: 8, label: 'Analytics', icon: BarChart3, hint: 'This project only' },
];

// Sidebar nav (mobile): per-project tools only — dashboard/analytics are project-scoped
const SIDEBAR_NAV = [
  { id: 'overview', label: 'Overview', icon: HomeIcon },
  { id: 'materials', label: 'Materials', icon: Folder },
  { id: 'tutor', label: 'AI Tutor', icon: MessagesSquare },
  { id: 'concepts', label: 'Concepts', icon: BookOpen },
  { id: 'quiz', label: 'Quiz', icon: Target },
  { id: 'practice', label: 'Practice', icon: PenLine },
  { id: 'recommendations', label: 'Recommendations', icon: Compass },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const TAB_LABEL = {
  overview: 'Overview',
  tutor: 'AI Tutor',
  materials: 'Materials',
  concepts: 'Concepts',
  quiz: 'Quiz',
  practice: 'Practice',
  recommendations: 'Recommendations',
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
  // live upload progress: {pct, stage, elapsedMs} + local start clock
  const [matProgress, setMatProgress] = useState(null);
  const [uploadStart, setUploadStart] = useState(null);
  const [q, setQ] = useState('');
  const [chat, setChat] = useState([]);  const [asking, setAsking] = useState(false);
  // Tutor saved chats (left CHATS panel, like screenshot)
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState('default');
  const [chatSearch, setChatSearch] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [chatsCollapsed, setChatsCollapsed] = useState(false);
  const [showMobileChats, setShowMobileChats] = useState(false);
  const chatBoxRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [mastery, setMastery] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [rec, setRec] = useState(null);
  const [adaptive, setAdaptive] = useState(null);
  const [quizTip, setQuizTip] = useState('');
  // Quiz setup state (count / timer / topics)
  const [answeringId, setAnsweringId] = useState(null);
  const [startingQuiz, setStartingQuiz] = useState(false);
  // Inline flashcard widgets inside the Quiz thread (deck counts stay in sync)
  const [quizCardWidgets, setQuizCardWidgets] = useState([]);
  // Practice assignment paper state (declared up-front: `done` below reads it)
  const [pCount, setPCount] = useState(5);
  const [pDifficulty, setPDifficulty] = useState('mixed');
  const [pTypes, setPTypes] = useState(['mcq', 'tf', 'short', 'open']);
  const [pQuestions, setPQuestions] = useState([]);
  const [pStarting, setPStarting] = useState(false);
  const [pTip, setPTip] = useState('');
  // Quiz setup (count / timer / topics) like a full quiz lobby
  const [quizCount, setQuizCount] = useState(4);
  const [quizTimer, setQuizTimer] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [roundExpired, setRoundExpired] = useState(false);
  const timerRef = useRef(null);
  const [topicMode, setTopicMode] = useState('all');
  const [pickedTopics, setPickedTopics] = useState([]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(null);
  }
  const [analytics, setAnalytics] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [matsLoading, setMatsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // Flashcards deck (counts for dashboard + tutor sync; drills live in Quiz/Tutor threads)
  const [cards, setCards] = useState([]);
  const [genCards, setGenCards] = useState(false);
  // In-chat tutor widgets (declared up-front: scroll effects below depend on them)
  const [tutorQuizzes, setTutorQuizzes] = useState([]);
  const [tutorCards, setTutorCards] = useState([]);

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat, asking, tab, tutorQuizzes, tutorCards]);

  // Tutor: freeze page scroll, inner panes scroll instead (like screenshot).
  // Quiz stays a normal scrolling page (setup + history + rounds are long) —
  // locking body overflow here is what froze scrolling on the quiz tab.
  // Reset window scroll on entry — otherwise a leftover scroll offset from the
  // previous tab freezes the pane shifted up under the navbar.
  useEffect(() => {
    if (tab !== 'tutor') return;
    window.scrollTo(0, 0);
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
      refreshStats();
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
        await loadFlashcards();
      } catch {}
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
    } catch {}
  }

  const avg = mastery.length ? Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length) : 0;
  const done = {
    overview: true,
    materials: matStatus.includes('ready'),
    tutor: chat.length > 0,
    concepts: mastery.length > 0,
    quiz: questions.length > 0 || (analytics?.attempts || 0) > 0,
    practice: pQuestions.length > 0,
    recommendations: !!(adaptive?.current || rec),
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
    setMatProgress({ pct: 2, stage: 'Uploading file', elapsedMs: 0 });
    setUploadStart(Date.now());
    const { data } = await api.post(`/api/projects/${id}/materials`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const mid = data.material._id;
    setMatStatus('queued...');
    const poll = async () => {
      try {
        const s = await api.get(`/api/materials/${mid}/status`);
        const m = s.data.material;
        setMatStatus(m.status + (m.error ? ` — ${m.error}` : ''));
        setMatProgress({ pct: m.progress ?? 0, stage: m.stage || m.status, elapsedMs: m.elapsedMs || 0 });
        loadMaterials().catch(() => {});
        if (['ready', 'failed'].includes(m.status)) {
          clearInterval(timer);
          setUploadStart(null);
          refreshStats();
          loadMaterials();
        }
      } catch {}
    };
    const timer = setInterval(poll, 2500);
    poll();
  }

  // live elapsed ticker while an upload is processing
  const [, setTick] = useState(0);
  useEffect(() => {
    if (uploadStart == null) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [uploadStart]);

  function fmtElapsed(ms) {
    const s = Math.max(0, Math.floor((ms || 0) / 1000));
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  }

  async function ask(e) {
    e?.preventDefault();
    await sendText(q);
  }

  async function sendText(text, sessOverride) {
    if (!text.trim() || asking) return;
    const qq = text;
    const sess = sessOverride || activeSession || 'default';
    setQ('');
    setAsking(true);
    setChat((c) => [...c, { role: 'user', text: qq }]);
    scrollChatEnd();
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
  function scrollChatEnd() {
    setTimeout(() => chatBoxRef.current?.scrollTo({ top: chatBoxRef.current?.scrollHeight || 0, behavior: 'smooth' }), 60);
  }

  function newChat() {
    const sid = `s_${Date.now().toString(36)}`;
    setActiveSession(sid);
    setChat([]);
    setQ('');
    scrollChatEnd();
  }

  // Quiz → Tutor handoff: open a NEW chat and send a quiz-prep question that
  // mentions the current topic selection, so the tutor answers in quiz context.
  function askTutorAboutQuiz() {
    if (asking) return;
    const pool = buildTopicPool();
    const focus = pool && pool.length ? pool.slice(0, 5).join(', ') : null;
    const weak = mastery.filter((m) => m.score < 60).slice(0, 3).map((m) => `${m.concept} (${m.score}%)`);
    const sid = `s_${Date.now().toString(36)}`;
    setActiveSession(sid);
    setChat([]);
    setQ('');
    goTab('tutor');
    const msg = focus
      ? `I'm about to take a quiz on ${focus}${weak.length ? ` — my weakest spots are ${weak.join(', ')}` : ''}. What are the key ideas I must know? Teach me briefly with one example each from my PDFs.`
      : `I'm about to take a quiz on this project's materials. What are the key ideas I must know? Teach me briefly with one example each from my PDFs.`;
    setTimeout(() => sendText(msg, sid), 300);
  }

  async function openSession(sid) {
    if (sid === activeSession || asking) return;
    setActiveSession(sid);
    try {
      const { data } = await api.get(`/api/projects/${id}/tutor/history`, { params: { session: sid } });
      setChat(data.messages || []);
      scrollChatEnd();
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

  // In-chat quiz widgets: one question at a time (MCQ style) — answer to advance.

  function setTutorQi(wkey, qi) {
    setTutorQuizzes((ws) => ws.map((w) => w.key === wkey ? { ...w, qi } : w));
  }

  async function startTutorQuiz(concept) {
    setStartingQuiz(true);
    try {
      const body = { count: 3, mcqOnly: true };
      if (concept) body.concept = concept;
      const { data } = await api.post(`/api/projects/${id}/quiz/start`, body);
      setTutorQuizzes((w) => [...w, {
        key: `tq${Date.now()}`,
        at: Date.now(),
        concept: concept || 'Adaptive mix',
        qi: 0,
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
    const stamp = (result) => setTutorQuizzes((ws) => ws.map((w) => {
      if (w.key !== wkey) return w;
      const questions = w.questions.map((x) => x.id === qid ? { ...x, result, answering: false } : x);
      const idx = questions.findIndex((x) => x.id === qid);
      // auto-advance when the current question is answered
      const qi = (idx === (w.qi ?? 0) && idx < questions.length - 1) ? idx + 1 : (w.qi ?? 0);
      return { ...w, questions, qi };
    }));
    try {
      const { data } = await api.post(`/api/quiz/${qid}/answer`, { answer: t });
      stamp(data);
    } catch (err) {
      stamp({ score: 0, feedback: { text: err.response?.data?.error || 'Grading failed.' } });
    } finally {
      refreshStats();
    }
  }

  // In-chat flashcard widgets: one card at a time — review to advance.

  function setTutorCi(wkey, ci) {
    setTutorCards((ws) => ws.map((w) => w.key === wkey ? { ...w, ci } : w));
  }

  async function startTutorCards(concept) {
    setGenCards(true);
    try {
      const body = { count: 6 };
      if (concept) body.concept = concept;
      const { data } = await api.post(`/api/projects/${id}/flashcards/generate`, body);
      await loadFlashcards();
      setTutorCards((w) => [...w, {
        key: `tc${Date.now()}`,
        at: Date.now(),
        concept: concept || (data.adaptive?.focus || [])[0] || 'Adaptive',
        ci: 0,
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
      setTutorCards((ws) => ws.map((w) => {
        if (w.key !== wkey) return w;
        const cards = w.cards.map((c) => c._id === cardId ? { ...c, reviewed: known, msg: data.adaptive?.suggestion || '' } : c);
        const idx = cards.findIndex((c) => c._id === cardId);
        // auto-advance to the next unreviewed card
        let ci = w.ci ?? 0;
        if (idx === ci) {
          const next = cards.findIndex((c) => c.reviewed == null);
          ci = next === -1 ? ci : next;
        }
        return { ...w, cards, ci };
      }));
      refreshStats();
    } catch {}
  }

  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // A/B/C/D display label for an MCQ option (strips any baked-in prefix)
  function optionLabel(o, i) {
    return `${String.fromCharCode(65 + i)}. ${String(o || '').replace(/^[A-D][.)\-:]\s*/, '')}`;
  }

  // True when option o is the correct answer for an answered question
  function isCorrectOption(x, o) {
    if (!x?.result) return false;
    if (x.result.correctAnswer) return o === x.result.correctAnswer;
    return x.result.score === 100 && o === x.answer;
  }

  function fmtDay(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return sameDay ? 'Today' : `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
  }
  // Topics selection narrows the adaptive pool (still weakest-first inside it)
  function buildTopicPool() {
    if (pickedTopics.length) return pickedTopics;
    if (topicMode === 'weak') {
      const weak = mastery.filter((m) => m.score < 60).map((m) => m.concept);
      if (weak.length) return weak;
    }
    if (topicMode === 'untested') {
      const known = new Set(mastery.map((m) => m.concept));
      const fresh = (concepts.length ? concepts.map((c) => c.name) : []).filter((n) => !known.has(n));
      if (fresh.length) return fresh;
    }
    return null;
  }

  async function startQuiz(count = quizCount, concept = null) {
    setStartingQuiz(true);
    setRoundExpired(false);
    clearTimer();
    try {
      const body = { count: Math.max(1, Math.min(count || quizCount, 8)) };
      if (concept) {
        body.concept = concept;
      } else {
        const pool = buildTopicPool();
        if (pool) body.concepts = pool;
      }
      const { data } = await api.post(`/api/projects/${id}/quiz/start`, body);
      const qs = data.questions.map((x) => ({ ...x, answer: '', result: null }));
      setQuestions(qs);
      setQuizTip(data.adaptive?.tip || '');
      setTimeout(() => document.getElementById('quiz-round')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      if (quizTimer > 0) {
        const deadline = Date.now() + quizTimer * 60000;
        setTimeLeft(quizTimer * 60);
        timerRef.current = setInterval(() => {
          const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
          setTimeLeft(s);
          if (s <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setRoundExpired(true);
          }
        }, 1000);
      }
    } finally {
      setStartingQuiz(false);
    }
  }

  function fmtClock(s) {
    const m = Math.floor((s || 0) / 60);
    const r = String((s || 0) % 60).padStart(2, '0');
    return `${m}:${r}`;
  }

  async function gradeAndRecord(setQs, x, overrideText, source = 'quiz') {
    const text = (overrideText ?? x.answer ?? '').trim();
    if (!text || answeringId) return;
    setAnsweringId(x.id);
    // optimistic: show the typed answer immediately in the thread
    setQs((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: text } : y)));
    try {
      const { data } = await api.post(`/api/quiz/${x.id}/answer`, { answer: text, source });
      setQs((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: text, result: data } : y)));
    } catch (err) {
      setQs((qs) => qs.map((y) => (y.id === x.id ? { ...y, result: { score: 0, feedback: { text: err.response?.data?.error || 'Grading failed — try again.' } } } : y)));
    } finally {
      setAnsweringId(null);
      refreshStats();
    }
  }

  async function answer(x, overrideText) {
    if (roundExpired) return;
    return gradeAndRecord(setQuestions, x, overrideText, 'quiz');
  }

  async function answerPaper(x, overrideText) {
    return gradeAndRecord(setPQuestions, x, overrideText, 'practice');
  }

  // ---- Practice assignment (exam-style paper) ----
  const TYPE_META = {
    mcq: { label: 'Multiple choice', tag: 'instant', desc: 'Section A · 4 options' },
    tf: { label: 'True / False', tag: 'instant', desc: 'Section A · statement check' },
    short: { label: 'One word', tag: 'instant', desc: 'Section B · short answer' },
    open: { label: 'Open ended', tag: 'AI graded', desc: 'Section C · descriptive, AI graded' },
  };

  function sectionOf(t) {
    return t === 'mcq' || t === 'tf' ? 'Section A' : t === 'short' ? 'Section B' : 'Section C';
  }

  function togglePType(t) {
    setPTypes((p) => {
      const next = p.includes(t) ? p.filter((x) => x !== t) : [...p, t];
      return next.length ? next : p;
    });
  }

  async function startPaper() {
    if (!pTypes.length) return;
    setPStarting(true);
    try {
      const body = { count: Math.max(1, Math.min(pCount, 12)), qtypes: pTypes };
      const pool = buildTopicPool();
      if (pool) body.concepts = pool;
      if (pDifficulty !== 'mixed') body.difficulty = pDifficulty;
      const { data } = await api.post(`/api/projects/${id}/quiz/start`, body);
      setPQuestions((data.questions || []).map((x) => ({ ...x, answer: '', result: null })));
      setPTip(data.adaptive?.tip || '');
      setTimeout(() => document.getElementById('practice-paper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } finally {
      setPStarting(false);
    }
  }

  // (quiz chips were replaced by the setup-card layout above)

  // Inline flashcard widgets inside the Quiz thread
  async function openQuizCards(concept) {
    setGenCards(true);
    try {
      const body = { count: 6 };
      if (concept) body.concept = concept;
      const { data } = await api.post(`/api/projects/${id}/flashcards/generate`, body);
      await loadFlashcards();
      setQuizCardWidgets((w) => [...w, {
        key: `qc${Date.now()}`,
        concept: concept || (data.adaptive?.focus || [])[0] || 'Adaptive',
        cards: (data.cards || []).map((c) => ({ ...c, flipped: false, reviewed: null, msg: '' })),
      }]);
      refreshStats();
    } finally {
      setGenCards(false);
    }
  }

  async function reviewQuizCard(wkey, cardId, known) {
    try {
      const { data } = await api.post(`/api/flashcards/${cardId}/review`, { known });
      setQuizCardWidgets((ws) => ws.map((w) => w.key === wkey
        ? { ...w, cards: w.cards.map((c) => c._id === cardId ? { ...c, reviewed: known, msg: data.adaptive?.suggestion || '' } : c) }
        : w));
      refreshStats();
    } catch {}
  }

  async function generateFlashcards(focusConcept) {
    return openQuizCards(focusConcept);
  }

  if (!project) return <div className="theme-dashboard min-h-screen"><PageSkeleton /></div>;
  return (
    <div className={`theme-dashboard min-h-screen ${tab === 'tutor' ? 'pb-0' : 'pb-16'} ${tab === 'overview' ? 'bg-gradient-to-b from-sky-100 via-indigo-50 to-transparent dark:from-[#0b1a33] dark:via-[#0d1530] dark:to-transparent' : ''}`}>
      {/* In-page nav — mobile only (global sidebar rules on desktop):
          compact sticky bar: project row + horizontally scrollable tool pills */}
      <div className="sticky top-16 z-[90] border-b border-border bg-bg2/95 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <Link to="/" title="Back to spaces" className="shrink-0 rounded-lg p-1.5 text-sm font-medium text-text2 hover:bg-surface hover:text-text">
            <span aria-hidden>←</span>
          </Link>
          <button onClick={() => goTab('overview')} title="Go to overview" className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
              {initial(project.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text">{project.name}</span>
              <span className="block truncate text-[11px] text-text3">{project.goal?.slice(0, 40) || 'project'}</span>
            </span>
          </button>
          <span className="flex shrink-0 items-center gap-1.5" title={`Average mastery ${avg}%`}>
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface"><span className="block h-1.5 rounded-full bg-accent" style={{ width: `${avg}%` }} /></span>
            <b className="text-xs">{avg}%</b>
          </span>
        </div>
        <nav className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto px-3 pb-2.5">
          {SIDEBAR_NAV.map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => goTab(item.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'border-accent bg-accent text-white shadow-sm' : 'border-border bg-bg3 text-text2 hover:border-accent hover:text-accent'
                }`}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content — tutor goes edge-to-edge with zero padding */}
      <div className={tab === 'tutor' ? '' : 'container pt-6'}>
        <div className={tab === 'tutor' ? '' : 'mt-3'}>
          {/* Adaptive next step lives only in the dedicated Recommendations tab — no floating banner anywhere else */}
          {tab === 'overview' && (() => {
            const C = 2 * Math.PI * 30;
            return (
            <div className="card fade-up relative overflow-hidden !border-sky-300/60 !bg-gradient-to-br !from-sky-100 !via-indigo-100 !to-sky-200 !p-6 dark:!border-white/10 dark:!from-[#0e2140] dark:!via-[#141b3d] dark:!to-[#0b2f4a]">
              <div className="relative flex flex-wrap items-center gap-5">
                <div className="relative h-[84px] w-[84px] shrink-0" title={`Average mastery ${avg}%`}>
                  <svg width="84" height="84" className="-rotate-90">
                    <circle cx="42" cy="42" r="30" fill="none" stroke="var(--color-accent)" strokeOpacity="0.15" strokeWidth="9" />
                    <circle cx="42" cy="42" r="30" fill="none" stroke="var(--color-accent)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * (avg || 0)) / 100} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-heading text-lg font-extrabold">{avg}%</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text3">Project overview · avg mastery</p>
                  <h1 className="font-heading truncate text-2xl font-extrabold">{project?.name || 'Project'}</h1>
                  {!!project?.goal && <p className="truncate text-sm text-text2"><b className="font-semibold text-text">Goal:</b> {project.goal}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text2">
                    <span><b className="font-extrabold text-text">{materials.length}</b> materials</span>
                    <span><b className="font-extrabold text-text">{mastery.length}</b> concepts</span>
                    <span><b className="font-extrabold text-text">{analytics?.attempts ?? 0}</b> attempts</span>
                    <span><b className="font-extrabold text-text">{analytics?.avgScore ?? 0}%</b> avg score</span>
                    <span><b className="font-extrabold text-text">{sessions.length}</b> tutor chats</span>
                  </div>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <button onClick={() => goTab('tutor')} className="btn btn-primary flex-1 justify-center sm:flex-none"><MessagesSquare size={15} /> Ask Tutor</button>
                  <button onClick={() => goTab('quiz')} className="btn btn-outline flex-1 justify-center sm:flex-none"><ListChecks size={15} /> Take Quiz</button>
                </div>
              </div>
            </div>
            );
          })()}

          {tab === 'overview' && (() => {
            const attempts = analytics?.recentAttempts || [];
            const quizN = attempts.filter((a) => (a.source || 'quiz') !== 'practice').length;
            const practiceN = attempts.filter((a) => a.source === 'practice').length;
            const sorted = mastery.slice().sort((a, b) => a.score - b.score);
            const weakest3 = sorted.slice(0, 3);
            const nextText = adaptive?.current?.text || rec?.text;
            const steps = [
              { label: 'Materials', tab: 'materials', Icon: UploadCloud, sub: materials.length ? `${materials.length} PDF${materials.length > 1 ? 's' : ''}` : 'Upload a PDF', done: materials.length > 0 },
              { label: 'Tutor', tab: 'tutor', Icon: MessagesSquare, sub: sessions.length ? `${sessions.length} chat${sessions.length > 1 ? 's' : ''}` : 'Ask anything', done: sessions.length > 0 },
              { label: 'Quiz', tab: 'quiz', Icon: ListChecks, sub: quizN ? `${quizN} attempt${quizN > 1 ? 's' : ''}` : 'Test yourself', done: quizN > 0 },
              { label: 'Practice', tab: 'practice', Icon: PenLine, sub: practiceN ? `${practiceN} paper${practiceN > 1 ? 's' : ''}` : 'Exam mode', done: practiceN > 0 },
              { label: 'Mastery', tab: 'dashboard', Icon: Target, sub: mastery.length ? `${avg}% avg` : 'No scores yet', done: mastery.length > 0 },
              { label: 'Growth', tab: 'growth', Icon: BarChart3, sub: growth.length ? 'Tracking' : 'No history', done: growth.length > 0 },
              { label: 'Next step', tab: 'recommendations', Icon: Compass, sub: nextText ? 'Ready for you' : 'Do any task', done: !!nextText },
            ];
            const doneCount = steps.filter((s) => s.done).length;
            const curIdx = steps.findIndex((s) => !s.done);
            const browse = [
              { label: 'Materials', desc: 'Upload and manage PDF materials', tab: 'materials', Icon: UploadCloud },
              { label: 'Tutor', desc: 'Ask questions about your materials', tab: 'tutor', Icon: MessagesSquare },
              { label: 'Concepts', desc: 'Grouped by material, weakest first', tab: 'concepts', Icon: BookOpen },
              { label: 'Quiz', desc: 'Adaptive MCQs from your weak spots', tab: 'quiz', Icon: ListChecks },
              { label: 'Practice', desc: 'Exam-style papers with sections', tab: 'practice', Icon: PenLine },
              { label: 'Dashboard', desc: 'Mastery snapshot for this project', tab: 'dashboard', Icon: LayoutDashboard },
            ];
            const barColor = (s) => (s < 60 ? 'bg-red-500' : s < 80 ? 'bg-amber-500' : 'bg-green-500');
            return (
            <div className="mt-4 space-y-4">
              {/* Journey path — where you are in the loop, what comes next */}
              <div className="card fade-up">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-bold">Your learning journey</h3>
                    <p className="text-xs text-text3">7 stages from upload to next step — tap any stage to jump in.</p>
                  </div>
                  <span className="badge badge-info">{doneCount}/7 complete</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-2 rounded-full bg-gradient-to-r from-accent to-accent2 transition-all" style={{ width: `${Math.round((doneCount / 7) * 100)}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                  {steps.map((s, i) => {
                    const state = s.done ? 'done' : i === curIdx ? 'next' : 'todo';
                    return (
                      <button key={s.label} onClick={() => goTab(s.tab)} title={`${s.label}: ${s.sub}`} className={`relative rounded-2xl border p-3 text-left transition ${state === 'next' ? 'border-accent bg-accent/[0.07] shadow-sm ring-1 ring-accent' : state === 'done' ? 'border-green-200 bg-green-50/60 hover:border-green-400 dark:border-green-900 dark:bg-green-950/30' : 'border-border bg-bg3 hover:border-accent'}`}>
                        <span className="flex items-center justify-between">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${state === 'done' ? 'bg-green-500 text-white' : state === 'next' ? 'bg-accent text-white' : 'bg-surface text-text3'}`}>
                            {state === 'done' ? <CheckCircle2 size={15} /> : <s.Icon size={15} />}
                          </span>
                          <span className="text-[10px] font-extrabold text-text3">0{i + 1}</span>
                        </span>
                        <p className="mt-2 text-[13px] font-bold leading-tight">{s.label}</p>
                        <p className="truncate text-[11px] text-text3">{s.sub}</p>
                        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${state === 'done' ? 'bg-green-500/15 text-green-700 dark:text-green-300' : state === 'next' ? 'bg-accent/15 text-accent' : 'bg-surface text-text3'}`}>
                          {state === 'done' ? '✓ Done' : state === 'next' ? '◉ Start here' : '○ To do'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  {/* Mastery bars */}
                  <div className="card fade-up">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading font-bold">Mastery by concept</h3>
                      <span className="text-xs text-text3">{mastery.length} tracked · avg {avg}%</span>
                    </div>
                    {mastery.length ? (
                      <div className="mt-3 space-y-2.5">
                        {sorted.slice(0, 8).map((m) => (
                          <div key={m.concept}>
                            <div className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-semibold">{m.concept}</span><span className="shrink-0 text-text3">{m.score}% · {m.mistakes}✕</span></div>
                            <div className="mt-1 h-2 rounded-full bg-surface"><div className={`h-2 rounded-full ${barColor(m.score)}`} style={{ width: `${m.score}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-text3">No scores yet — take a quiz to light up this chart.</p>
                        <button onClick={() => goTab('quiz')} className="btn btn-primary !py-1.5 !text-xs">Take Quiz →</button>
                      </div>
                    )}
                  </div>
                  {/* Weakest spotlight */}
                  <div className="card fade-up">
                    <h3 className="font-heading font-bold">Needs your attention <span className="text-xs font-normal text-text3">weakest concepts first</span></h3>
                    {weakest3.length ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {weakest3.map((m) => (
                          <div key={m.concept} className="rounded-2xl border border-border bg-bg3 p-3">
                            <p className="truncate text-sm font-bold" title={m.concept}>{m.concept}</p>
                            <p className="mt-0.5 text-xs text-text3">{m.score}% mastery · {m.mistakes} mistakes</p>
                            <div className="mt-1 h-1.5 rounded-full bg-surface"><div className={`h-1.5 rounded-full ${barColor(m.score)}`} style={{ width: `${m.score}%` }} /></div>
                            <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1">
                              <button onClick={() => goTab('quiz')} className="text-[11px] font-bold text-accent hover:underline">Quiz →</button>
                              <button onClick={() => { startQuiz(4, m.concept); goTab('quiz'); }} className="text-[11px] font-bold text-accent hover:underline">Drill →</button>
                              <button onClick={() => { goTab('tutor'); setTimeout(() => sendText(`Explain ${m.concept} simply with one example from my PDFs`), 300); }} className="text-[11px] font-bold text-accent hover:underline">Ask tutor →</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-2 text-sm text-text3">Upload material and take a quiz — weak spots appear here.</p>}
                  </div>
                </div>
                <div className="space-y-4">
                  {!materials.length && (
                    <div className="card fade-up">
                      <h3 className="flex items-center gap-1.5 font-heading font-bold"><BookOpen size={16} className="text-accent" /> Get started</h3>
                      <p className="mt-1 text-sm text-text2">Upload a PDF to build your knowledge base, then ask the Tutor and take a quiz — weak spots will surface here.</p>
                      <button onClick={() => goTab('materials')} className="btn btn-primary mt-2 w-full !py-2 !text-xs">Upload material →</button>
                    </div>
                  )}
                  {/* Activity timeline */}
                  <div className="card fade-up">
                    <h3 className="font-heading font-bold">Recent activity</h3>
                    <div className="mt-2 space-y-0">
                      {(analytics?.events || []).slice(0, 6).map((e, i, arr) => (
                        <div key={i} className="flex gap-2.5">
                          <div className="flex flex-col items-center">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                            {i < arr.length - 1 && <span className="w-px flex-1 bg-border" />}
                          </div>
                          <div className="pb-3">
                            <p className="text-xs font-bold">{e.type}</p>
                            <p className="text-[11px] text-text3">{new Date(e.at || e.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                      {!(analytics?.events || []).length && <p className="text-sm text-text3">Nothing yet — your actions appear here.</p>}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="label !mb-2 !text-xs !font-bold !uppercase !tracking-widest">Browse everything</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {browse.map((b) => (
                    <button key={b.label} onClick={() => goTab(b.tab)} className="card fade-up group flex items-start gap-3 !p-4 text-left transition hover:border-accent">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><b.Icon size={19} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 font-heading text-[15px] font-bold">{b.label}<span className="text-text3 transition group-hover:translate-x-0.5 group-hover:text-accent">→</span></span>
                        <span className="mt-0.5 block truncate text-xs text-text2">{b.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            );
          })()}

          {tab === 'materials' && (
            <form onSubmit={upload} className="card fade-up mt-4">
              <h2 className="font-heading text-lg font-bold">Step 1 — Upload learning material</h2>
              <p className="text-sm text-text2">PDF only, 15MB max. Background: queued → processing → ready. Next: ask the Tutor.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
                <button className="btn btn-primary"><UploadCloud size={16} /> Upload & process</button>
              </div>
              <p className="mt-2 text-sm">Status: <span className={`badge ${matStatus.includes('ready') ? 'badge-low' : matStatus.includes('fail') ? 'badge-high' : 'badge-medium'}`}>{matStatus || 'no upload yet'}</span></p>
              {/* Upload progress lives on the document row below — no duplicate bar here */}
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
                    <div key={m._id} className="rounded-xl border border-border bg-bg3 px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{m.filename}</span>
                          <span className="text-xs text-text3">{m.pages || '?'} pages · {new Date(m.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span className={`badge ${m.status === 'ready' ? 'badge-low' : m.status === 'failed' ? 'badge-high' : 'badge-medium'}`}>{m.status}{['queued', 'processing'].includes(m.status) ? ` ${m.progress ?? 0}%` : ''}</span>
                        <button onClick={() => deleteMaterial(m._id, m.filename)} disabled={deletingId === m._id} title={`Delete ${m.filename}`} className="rounded-lg p-1.5 text-text3 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          {deletingId === m._id ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border2 border-t-red-600" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                      {['queued', 'processing'].includes(m.status) && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[11px] text-text3">
                            <span>{m.stage || m.status}…</span>
                            <span className="font-bold text-text">{m.progress ?? 0}% · {fmtElapsed(m.elapsedMs)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                            <div className="h-1.5 rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, m.progress ?? 0))}%` }} />
                          </div>
                        </div>
                      )}
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
              const key = c.docName || 'Document';
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
                          <button onClick={() => { startQuiz(4, m.name); goTab('quiz'); }} className="text-[11px] font-semibold text-accent hover:underline">Practice →</button>
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
                  <button onClick={() => goTab('tutor')} className="btn btn-outline !py-1.5 !text-xs">Ask tutor →</button>
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
            <div className="relative flex h-[calc(100dvh-4rem)] overflow-hidden bg-bg md:h-[calc(100vh-64px)] md:min-h-[500px]">
              {/* LEFT — CHATS (desktop panel; ‹ collapses. On phones use the Chats drawer instead) */}
              {!chatsCollapsed ? (
              <div className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg2 md:flex">
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
              <button onClick={() => setChatsCollapsed(false)} title="Expand chats" className="hidden w-8 shrink-0 items-start justify-center border-r border-border bg-bg2 pt-3 text-lg text-text3 transition hover:bg-surface hover:text-text md:flex">›</button>
              )}

              {/* Mobile chats drawer */}
              {showMobileChats && (
                <div className="absolute inset-0 z-30 md:hidden">
                  <div onClick={() => setShowMobileChats(false)} className="absolute inset-0 bg-black/40" />
                  <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-bg2 shadow-xl">
                    <div className="border-b border-border p-3">
                      <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-text3">
                        Chats
                        <button onClick={() => setShowMobileChats(false)} title="Close chats" className="rounded px-1.5 py-0.5 text-base leading-none hover:bg-surface hover:text-text">✕</button>
                      </p>
                      <button onClick={() => { newChat(); setShowMobileChats(false); }} className="btn btn-primary w-full !py-2 !text-xs">+ New Chat</button>
                      <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search conversations" className="input mt-2 !py-1.5 !text-xs" />
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                      {filteredSessions.map((s) => {
                        const isActive = s.id === activeSession;
                        return (
                          <div key={s.id} onClick={() => { openSession(s.id); setShowMobileChats(false); }} className={`cursor-pointer rounded-xl px-2.5 py-2 transition ${isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-text2 hover:bg-surface hover:text-text'}`}>
                            <p className="truncate text-xs">{s.title}</p>
                            <p className="mt-0.5 text-[10px] text-text3">{fmtDay(s.updatedAt)} · {s.exchanges} exchange{s.exchanges === 1 ? '' : 's'}</p>
                          </div>
                        );
                      })}
                      {!filteredSessions.length && !sessionsLoading && <p className="px-2 py-6 text-center text-xs text-text3">{sessions.length ? 'No match.' : 'No chats yet — start one.'}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* CENTER — conversation (like screenshot) */}
              <div className="flex min-w-0 flex-1 flex-col bg-bg">
                {/* Mobile chats toggle */}
                <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg2 px-3 py-2 md:hidden">
                  <button onClick={() => setShowMobileChats(true)} className="flex items-center gap-1.5 rounded-full border border-border bg-bg3 px-3 py-1.5 text-xs font-semibold text-text2">
                    <MessagesSquare size={13} /> Chats · {sessions.length}
                  </button>
                  <span className="min-w-0 flex-1 truncate text-xs text-text3">{sessions.find((s) => s.id === activeSession)?.title || 'AI Tutor'}</span>
                  <button onClick={() => { newChat(); }} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white">+ New</button>
                </div>
                <div ref={chatBoxRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5">
                  <div className="flex gap-2">
                    <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                    <div className="max-w-[94%] sm:max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-bg2 px-3.5 py-2.5 text-sm">
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
                          <div className="max-w-[90%] sm:max-w-[80%]">
                            <div className="rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-sm text-white"><p className="whitespace-pre-wrap">{m.text}</p></div>
                            <p className="mt-0.5 text-right text-[10px] text-text3">{fmtTime(m.createdAt) || '02:48'}</p>
                          </div>
                          <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-text2"><UserIcon size={14} /></span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                          <div className="max-w-[94%] sm:max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-bg2 px-3.5 py-2.5 text-sm">
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
                  {[...tutorQuizzes.map((w) => ({ ...w, wkind: 'quiz' })), ...tutorCards.map((w) => ({ ...w, wkind: 'cards' }))]
                    .sort((a, b) => (a.at || 0) - (b.at || 0))
                    .map((w) => {
                    if (w.wkind === 'cards') {
                      const ci = Math.min(w.ci ?? 0, w.cards.length - 1);
                      const c = w.cards[ci];
                      const cdone = w.cards.filter((k) => k.reviewed != null).length;
                      const callDone = cdone === w.cards.length && w.cards.length > 0;
                      const knew = w.cards.filter((k) => k.reviewed === true).length;
                      return (
                      <div key={w.key} className="flex gap-2">
                        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                        <div className="max-w-[94%] sm:max-w-[85%] flex-1 rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/[0.05] px-3.5 py-2.5 text-sm">
                          <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-accent">
                            <span>Flashcards · {w.concept}</span>
                            <span>{cdone}/{w.cards.length} reviewed</span>
                          </p>
                          <div className="mt-1.5 flex items-center gap-1">
                            {w.cards.map((k, i) => (
                              <button key={k._id} onClick={() => setTutorCi(w.key, i)} className={`h-2 flex-1 rounded-full transition ${k.reviewed === true ? 'bg-green-500' : k.reviewed === false ? 'bg-red-400' : i === ci ? 'bg-accent' : 'bg-surface'}`} />
                            ))}
                          </div>
                          {callDone ? (
                            <p className="mt-2 rounded-xl bg-bg2 px-2.5 py-2 text-[13px]"><b>Deck complete — {knew}/{w.cards.length} knew it.</b> Re-review the misses tomorrow.</p>
                          ) : c && (
                            <div className="mt-2 rounded-xl border border-border bg-bg2 p-2.5">
                              <p className="text-[11px] text-text3">Card {ci + 1} of {w.cards.length}</p>
                              <button onClick={() => setTutorCards((ws) => ws.map((v) => v.key === w.key ? { ...v, cards: v.cards.map((k) => k._id === c._id ? { ...k, flipped: !k.flipped } : k) } : v))} className="mt-0.5 w-full text-left text-sm font-semibold">
                                {c.flipped ? c.back : c.front}
                              </button>
                              <p className="mt-0.5 text-[10px] text-text3">{c.flipped ? 'Answer — tap to flip back' : 'Tap to reveal'}</p>
                              {c.reviewed == null ? (
                                <div className="mt-1.5 flex gap-1.5">
                                  <button onClick={() => reviewTutorCard(w.key, c._id, false)} className="btn btn-outline !px-2 !py-1 !text-[11px]">Still learning</button>
                                  <button onClick={() => reviewTutorCard(w.key, c._id, true)} className="btn btn-primary !px-2 !py-1 !text-[11px]">I knew it</button>
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-text2">{c.reviewed ? 'Marked known ✓' : 'Queued for review'} {c.msg && `— ${c.msg.slice(0, 90)}`}</p>
                              )}
                              <div className="mt-1.5 flex justify-between">
                                <button onClick={() => setTutorCi(w.key, Math.max(0, ci - 1))} disabled={ci === 0} className="text-[11px] font-semibold text-text3 hover:text-accent disabled:opacity-40">← Prev</button>
                                <button onClick={() => setTutorCi(w.key, Math.min(w.cards.length - 1, ci + 1))} disabled={ci >= w.cards.length - 1} className="text-[11px] font-semibold text-accent hover:underline disabled:opacity-40">Next →</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    }
                    const qi = Math.min(w.qi ?? 0, w.questions.length - 1);
                    const x = w.questions[qi];
                    const doneCount = w.questions.filter((v) => v.result).length;
                    const allDone = doneCount === w.questions.length && w.questions.length > 0;
                    const avg = doneCount ? Math.round(w.questions.reduce((s, v) => s + (v.result?.score || 0), 0) / doneCount) : 0;
                    return (
                    <div key={w.key} className="flex gap-2">
                      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                      <div className="max-w-[94%] sm:max-w-[85%] flex-1 rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/[0.05] px-3.5 py-2.5 text-sm">
                        <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-accent">
                          <span>Quiz · {w.concept}</span>
                          <span>{doneCount}/{w.questions.length} done</span>
                        </p>
                        <div className="mt-1.5 flex items-center gap-1">
                          {w.questions.map((v, i) => (
                            <button key={v.id} onClick={() => setTutorQi(w.key, i)} title={v.concept} className={`h-2 flex-1 rounded-full transition ${v.result ? (v.result.score >= 60 ? 'bg-green-500' : 'bg-red-400') : i === qi ? 'bg-accent' : 'bg-surface'}`} />
                          ))}
                        </div>
                        {allDone ? (
                          <p className="mt-2 rounded-xl bg-bg2 px-2.5 py-2 text-[13px]"><b>Set complete — {avg}% avg.</b> {avg < 60 ? 'Revise the misses above, then hit Practice for another round.' : 'Nice — hit Practice to lock it in, or Generate Quiz for a fresh mix.'}</p>
                        ) : x && (
                          <div className="mt-2 rounded-xl border border-border bg-bg2 p-2.5">
                            <p className="text-[11px] text-text3">Question {qi + 1} of {w.questions.length}</p>
                            <p className="mt-0.5"><span className="badge badge-info mr-1.5">{x.concept} · {x.difficulty}</span>{x.stem}</p>
                            <div className="mt-1.5 grid gap-1">
                              {x.options.map((o, i) => {
                                const right = x.result ? isCorrectOption(x, o) : false;
                                const wrongPick = x.result && !right && o === x.answer;
                                return (
                                <button key={o} onClick={() => !x.result && !x.answering && answerTutorQuiz(w.key, x.id, o)} disabled={!!x.result || x.answering} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[13px] transition ${x.result ? 'cursor-default border-border' : 'border-border hover:border-accent hover:text-accent'} ${!x.result && x.answer === o ? 'border-accent bg-accent/10 font-semibold' : ''}`}>
                                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${right ? 'bg-green-500 text-white' : wrongPick ? 'bg-red-500 text-white' : 'bg-surface text-text2'}`}>{String.fromCharCode(65 + i)}</span>
                                  <span>{String(o || '').replace(/^[A-D][.)\-:]\s*/, '')}</span>
                                  {right && <span className="ml-auto font-bold text-green-600">✓</span>}
                                  {wrongPick && <span className="ml-auto font-bold text-red-500">✕</span>}
                                </button>
                                );
                              })}
                            </div>
                            {x.answering && <p className="mt-1 text-xs text-text3">Grading…</p>}
                            {x.result && <p className="mt-1.5 rounded-lg bg-bg3 px-2 py-1.5 text-[13px]"><b>Score {x.result.score}</b> — {x.result.feedback?.text}</p>}
                            <div className="mt-1.5 flex justify-between">
                              <button onClick={() => setTutorQi(w.key, Math.max(0, qi - 1))} disabled={qi === 0} className="text-[11px] font-semibold text-text3 hover:text-accent disabled:opacity-40">← Prev</button>
                              <button onClick={() => setTutorQi(w.key, Math.min(w.questions.length - 1, qi + 1))} disabled={qi >= w.questions.length - 1} className="text-[11px] font-semibold text-accent hover:underline disabled:opacity-40">Next →</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {asking && (
                    <div className="flex gap-2">
                      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">AI</span>
                      <div className="w-3/4 max-w-[94%] sm:max-w-[85%] space-y-2 rounded-2xl rounded-bl-sm border border-border bg-bg2 p-3">
                        <Skel className="h-3 w-full" />
                        <Skel className="h-3 w-5/6" />
                        <Skel className="h-3 w-2/3" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 border-t border-border bg-bg2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
                  <div className="mb-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                    {TUTOR_CHIPS.map((c) => (
                      <button key={c.label} onClick={() => tutorChipAction(c.label)} disabled={asking || startingQuiz || genCards} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg3 px-3 py-1.5 text-xs font-medium text-text2 hover:border-accent hover:text-accent disabled:opacity-50"><c.icon size={13} /> {c.label}</button>
                    ))}
                  </div>
                  <form onSubmit={ask} className="flex gap-2">
                    <input id="tutor-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lastUserMsg ? 'Ask a follow-up…' : 'Ask anything from your material…'} className="input min-w-0 flex-1" />
                    <button className="btn btn-primary shrink-0 !px-4" disabled={asking}><Send size={16} /></button>
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
            const topicNames = concepts.length ? concepts.map((c) => c.name) : mastery.map((m) => m.concept);
            const weakList = mastery.filter((m) => m.score < 60);
            const knownSet = new Set(mastery.map((m) => m.concept));
            const untestedList = topicNames.filter((n) => !knownSet.has(n));
            const answered = questions.filter((v) => v.result).length;
            const history = (analytics?.recentAttempts || []).filter((a) => (a.source || 'quiz') !== 'practice').slice().reverse();
            const toggleTopic = (n) => {
              setPickedTopics((p) => p.includes(n) ? p.filter((t) => t !== n) : [...p, n]);
            };
            const modeActive = (m) => topicMode === m && !pickedTopics.length;
            return (
            <div className="mt-4 space-y-5">
              <p className="text-sm text-text2">Adaptive quiz — weaker and recently-missed concepts appear more often.</p>

              <div className="card fade-up">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-white sm:h-12 sm:w-12"><ListChecks size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-xl font-bold">Quiz</h2>
                    <p className="mt-1 text-sm text-text2">Questions per round, picked from your weakest concepts and recent mistakes. Difficulty adapts to your mastery — answer well and it gets harder.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-xl border border-border px-1.5 py-1.5">
                        <button onClick={() => setQuizCount((c) => Math.max(1, c - 1))} className="px-1.5 text-lg leading-none text-text2 hover:text-accent">−</button>
                        <b className="whitespace-nowrap text-sm">{quizCount} questions</b>
                        <button onClick={() => setQuizCount((c) => Math.min(8, c + 1))} className="px-1.5 text-lg leading-none text-text2 hover:text-accent">+</button>
                      </span>
                      <select value={quizTimer} onChange={(e) => setQuizTimer(Number(e.target.value))} title="Time limit" className="input !w-auto !py-2 text-sm">
                        <option value={0}>No limit</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={20}>20 min</option>
                      </select>
                      <button onClick={() => startQuiz()} disabled={startingQuiz} className="btn btn-primary">{startingQuiz ? 'Starting…' : 'Start quiz'}</button>
                      <button onClick={askTutorAboutQuiz} className="btn btn-outline">Ask tutor first</button>
                      {timeLeft != null && !roundExpired && <span className="badge badge-info">⏱ {fmtClock(timeLeft)}</span>}
                      {roundExpired && <span className="badge badge-high">Time&apos;s up — start a new round</span>}
                    </div>
                    {!!quizTip && <p className="alert alert-info mt-3 !mb-0">✨ {quizTip}</p>}

                    <div className="mt-4 rounded-2xl border border-border bg-bg3 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-heading font-bold">Topics</h3>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => { setTopicMode('all'); setPickedTopics([]); }} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${modeActive('all') ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent'}`}>All</button>
                          <button onClick={() => { setTopicMode('weak'); setPickedTopics([]); }} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${modeActive('weak') ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent'}`}>Weak only{weakList.length ? ` (${weakList.length})` : ''}</button>
                          <button onClick={() => { setTopicMode('untested'); setPickedTopics([]); }} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${modeActive('untested') ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent'}`}>Untested{untestedList.length ? ` (${untestedList.length})` : ''}</button>
                          <button onClick={() => { setTopicMode('all'); setPickedTopics([]); }} className="rounded-full border border-border px-2.5 py-1 text-xs text-text2 hover:border-accent hover:text-accent">Clear</button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-text2">Mixed across all your materials — untick anything to exclude it. Adaptive difficulty still picks your weakest within the selection.</p>
                      {topicNames.length ? (
                        <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                          {topicNames.map((n) => {
                            const on = pickedTopics.includes(n);
                            return (
                            <button key={n} onClick={() => toggleTopic(n)} title={on ? 'Click to include back' : 'Click to exclude'} className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-border text-text3 line-through opacity-70' : 'border-accent/50 bg-accent/10 font-semibold text-accent hover:border-accent'}`}>{n}</button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-text3">No topics yet — upload and process a PDF first. Quiz will use adaptive defaults.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {startingQuiz && (
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="card">
                      <Skel className="h-3 w-1/3" />
                      <div className="mt-2"><TextLines lines={2} /></div>
                      <Skel className="mt-2 h-9 w-full !rounded-xl" />
                    </div>
                  ))}
                </div>
              )}

              {!!questions.length && !startingQuiz && (
                <div id="quiz-round" className="space-y-3">
                  <p className="flex items-center justify-between text-sm font-bold">This round <span className="text-xs font-normal text-text3">{answered}/{questions.length} answered</span></p>
                  {roundExpired && <p className="alert alert-error !mb-0">⏱ Time&apos;s up for this round — answers are locked. Start a new round above.</p>}
                  {questions.map((x) => (
                    <div key={x.id} className="card">
                      <p className="text-sm"><span className="badge badge-info mr-2">{x.concept} · {x.difficulty}</span></p>
                      <div className="mt-1"><MathText text={x.stem} /></div>
                      {!!x.reason && <p className="mt-1 text-xs italic text-text3">🎯 Adaptive: {x.reason}</p>}
                      {x.type === 'mcq' ? (
                        <div className="mt-2 grid gap-1.5">
                          {x.options.map((o, i) => {
                            const right = x.result ? isCorrectOption(x, o) : false;
                            const wrongPick = x.result && !right && o === x.answer;
                            return (
                            <button key={o} onClick={() => answer(x, o)} disabled={!!x.result || !!answeringId || roundExpired} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm transition hover:border-accent hover:text-accent disabled:cursor-default disabled:hover:border-border disabled:hover:text-text">
                              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${right ? 'bg-green-500 text-white' : wrongPick ? 'bg-red-500 text-white' : 'bg-surface text-text2'}`}>{String.fromCharCode(65 + i)}</span>
                              <span>{optionLabel(o, i).slice(3)}</span>
                              {right && <span className="ml-auto font-bold text-green-600">✓</span>}
                              {wrongPick && <span className="ml-auto font-bold text-red-500">✕</span>}
                            </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input value={x.answer} onChange={(e) => setQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: e.target.value } : y)))} placeholder="Your answer" disabled={!!x.result || roundExpired} className="input flex-1" />
                          <button onClick={() => answer(x)} disabled={!!x.result || !!answeringId || roundExpired} className="btn btn-outline">Submit</button>
                        </div>
                      )}
                      {x.result && (
                        <div className="mt-2 space-y-1.5">
                          <p className="alert alert-info !mb-0">Score {x.result.score} — {x.result.feedback?.text}</p>
                          {!!x.result.adaptive?.suggestion && <p className="alert alert-success !mb-0">➜ Next: {x.result.adaptive.suggestion}</p>}
                          {!!x.result.adaptive?.recommendation && <p className="text-xs text-text2">💡 {x.result.adaptive.recommendation}</p>}
                          <div className="flex flex-wrap gap-1.5">
                            {!!x.result.adaptive?.flashcardConcept && (
                              <button onClick={() => { generateFlashcards(x.result.adaptive.flashcardConcept); }} className="btn btn-outline !py-1 !text-xs">Drill {x.result.adaptive.flashcardConcept} cards →</button>
                            )}
                            <button onClick={() => goTab('tutor')} className="btn btn-outline !py-1 !text-xs">Ask Tutor →</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {genCards && !quizCardWidgets.length && (
                <div className="card">
                  <Skel className="h-4 w-48" />
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {[0, 1].map((i) => <Skel key={i} className="h-20 w-full !rounded-xl" />)}
                  </div>
                </div>
              )}

              {quizCardWidgets.map((w) => (
                <div key={w.key} className="card !border-accent/30">
                  <p className="font-heading font-bold">Flashcards · {w.concept}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {w.cards.map((c) => (
                      <div key={c._id} className="rounded-xl border border-border bg-bg3 p-3">
                        <button onClick={() => setQuizCardWidgets((ws) => ws.map((v) => v.key === w.key ? { ...v, cards: v.cards.map((k) => k._id === c._id ? { ...k, flipped: !k.flipped } : k) } : v))} className="w-full text-left text-sm font-semibold">
                          {c.flipped ? c.back : c.front}
                        </button>
                        <p className="mt-0.5 text-[11px] text-text3">{c.flipped ? 'Answer — tap to flip back' : 'Tap to reveal'}</p>
                        {c.reviewed == null ? (
                          <div className="mt-1.5 flex gap-1.5">
                            <button onClick={() => reviewQuizCard(w.key, c._id, false)} className="btn btn-outline !px-2 !py-1 !text-[11px]">Still learning</button>
                            <button onClick={() => reviewQuizCard(w.key, c._id, true)} className="btn btn-primary !px-2 !py-1 !text-[11px]">I knew it</button>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-text2">{c.reviewed ? 'Marked known ✓' : 'Queued for review'}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold">History</h3>
                  <button onClick={refreshStats} className="text-xs font-medium text-text3 hover:text-accent">Refresh</button>
                </div>
                {history.length ? (
                  <div className="mt-2 max-h-64 space-y-1 overflow-auto">
                    {history.map((a, i) => (
                      <p key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-bg3 px-3 py-2 text-sm">
                        <span className="font-semibold">Attempt #{history.length - i}</span>
                        <span className={`badge ${a.score >= 60 ? 'badge-low' : 'badge-high'}`}>{a.score}%</span>
                        <span className="text-xs text-text3">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="mx-auto max-w-sm py-8 text-center">
                    <p className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-text3"><ListChecks size={22} /></p>
                    <p className="mt-3 font-heading font-bold">No quizzes yet</p>
                    <p className="mt-1 text-sm text-text3">Start your first round above — needs at least one processed PDF with concepts.</p>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {tab === 'practice' && (() => {
            const topicNames = concepts.length ? concepts.map((c) => c.name) : mastery.map((m) => m.concept);
            const weakList = mastery.filter((m) => m.score < 60);
            const knownSet = new Set(mastery.map((m) => m.concept));
            const untestedList = topicNames.filter((n) => !knownSet.has(n));
            const pAnswered = pQuestions.filter((v) => v.result).length;
            const pAvg = pAnswered ? Math.round(pQuestions.reduce((s, v) => s + (v.result?.score || 0), 0) / pAnswered) : 0;
            const pHistory = (analytics?.recentAttempts || []).filter((a) => a.source === 'practice').slice().reverse();
            const toggleTopic = (n) => {
              setPickedTopics((p) => p.includes(n) ? p.filter((t) => t !== n) : [...p, n]);
            };
            const modeActive = (m) => topicMode === m && !pickedTopics.length;
            const typeLabel = (t) => t === 'mcq' ? 'Multiple choice' : t === 'tf' ? 'True / False' : t === 'short' ? 'One word' : 'Open ended';
            return (
            <div className="mt-4 space-y-5">
              <div className="card fade-up">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-white sm:h-12 sm:w-12"><PenLine size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-xl font-bold">Practice assignment</h2>
                    <p className="mt-1 text-sm text-text2">An exam-style paper built from your weak concepts, recent mistakes, misconceptions, growth trend, and prerequisites.</p>
                    <div className="mt-3 grid gap-2.5 md:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-bg3 p-3.5 text-sm"><p className="font-bold">Section A · Objective.</p><p className="mt-0.5 text-text2">Multiple-choice + True/False — quick checks, instant marking.</p></div>
                      <div className="rounded-2xl border border-border bg-bg3 p-3.5 text-sm"><p className="font-bold">Section B · Short answer.</p><p className="mt-0.5 text-text2">One word or short phrase — synonyms count.</p></div>
                      <div className="rounded-2xl border border-border bg-bg3 p-3.5 text-sm"><p className="font-bold">Section C · Descriptive.</p><p className="mt-0.5 text-text2">Explain, reason, teach back — AI evaluates evidence.</p></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading font-bold">1 · Question types <span className="text-sm font-normal text-text3">{pTypes.length} of 4 selected</span></h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setPTypes(['mcq', 'tf', 'short', 'open'])} className="rounded-full border border-border px-2.5 py-1 text-xs text-text2 hover:border-accent hover:text-accent">All</button>
                    <button onClick={() => setPTypes(['short', 'open'])} className="rounded-full border border-border px-2.5 py-1 text-xs text-text2 hover:border-accent hover:text-accent">Open-ended only</button>
                    <button onClick={() => setPTypes(['mcq', 'tf'])} className="rounded-full border border-border px-2.5 py-1 text-xs text-text2 hover:border-accent hover:text-accent">Objective only</button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-text2">Tick the sections you want — e.g. only Open ended for deep writing. Objective + One word check instantly; Descriptive uses AI grading.</p>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {Object.entries(TYPE_META).map(([t, m]) => {
                    const on = pTypes.includes(t);
                    return (
                    <button key={t} onClick={() => togglePType(t)} className={`flex items-start gap-2.5 rounded-2xl border-2 p-3.5 text-left transition ${on ? 'border-accent bg-accent/[0.06]' : 'border-border opacity-70 hover:border-border2'}`}>
                      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold text-white ${on ? 'border-accent bg-accent' : 'border-border2 bg-transparent'}`}>{on ? '✓' : ''}</span>
                      <span>
                        <span className="flex items-center gap-1.5 font-bold">{m.label} <span className="badge badge-info !text-[10px]">{m.tag}</span></span>
                        <span className="mt-0.5 block text-xs text-text3">{m.desc}</span>
                      </span>
                    </button>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading font-bold">2 · Topics</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => { setTopicMode('all'); setPickedTopics([]); }} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${modeActive('all') ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent'}`}>All</button>
                    <button onClick={() => { setTopicMode('weak'); setPickedTopics([]); }} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${modeActive('weak') ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent'}`}>Weak only{weakList.length ? ` (${weakList.length})` : ''}</button>
                    <button onClick={() => { setTopicMode('untested'); setPickedTopics([]); }} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${modeActive('untested') ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent'}`}>Untested{untestedList.length ? ` (${untestedList.length})` : ''}</button>
                    <button onClick={() => { setTopicMode('all'); setPickedTopics([]); }} className="rounded-full border border-border px-2.5 py-1 text-xs text-text2 hover:border-accent hover:text-accent">Clear</button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-text2">Mixed across all your materials — untick anything to exclude it. Adaptive difficulty still picks your weakest within the selection.</p>
                {topicNames.length ? (
                  <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                    {topicNames.map((n) => {
                      const off = pickedTopics.includes(n);
                      return (
                      <button key={n} onClick={() => toggleTopic(n)} title={off ? 'Click to include back' : 'Click to exclude'} className={`rounded-full border px-2.5 py-1 text-xs transition ${off ? 'border-border text-text3 line-through opacity-70' : 'border-accent/50 bg-accent/10 font-semibold text-accent hover:border-accent'}`}>{n}</button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-text3">No topics yet — upload and process a PDF first. Practice will use adaptive defaults.</p>
                )}
              </div>

              <div className="card">
                <h3 className="font-heading font-bold">3 · How many questions?</h3>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-xl border border-border px-1.5 py-1.5">
                    <button onClick={() => setPCount((c) => Math.max(1, c - 1))} className="px-1.5 text-lg leading-none text-text2 hover:text-accent">−</button>
                    <b className="whitespace-nowrap text-sm">{pCount} questions</b>
                    <button onClick={() => setPCount((c) => Math.min(12, c + 1))} className="px-1.5 text-lg leading-none text-text2 hover:text-accent">+</button>
                  </span>
                  <span className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border p-1">
                    {['mixed', 'easy', 'medium', 'hard'].map((d) => (
                      <button key={d} onClick={() => setPDifficulty(d)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${pDifficulty === d ? 'bg-accent text-white' : 'text-text2 hover:text-accent'}`}>{d === 'mixed' ? 'Mixed (auto)' : d[0].toUpperCase() + d.slice(1)}</button>
                    ))}
                  </span>
                  <button onClick={startPaper} disabled={pStarting || !pTypes.length} className="btn btn-primary">{pStarting ? 'Building…' : 'Start assignment'}</button>
                  <button onClick={() => goTab('quiz')} className="btn btn-outline">Take a quiz instead</button>
                </div>
                {!!pTip && <p className="alert alert-info mt-3 !mb-0">✨ {pTip}</p>}
              </div>

              {pStarting && (
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="card">
                      <Skel className="h-3 w-1/3" />
                      <div className="mt-2"><TextLines lines={2} /></div>
                    </div>
                  ))}
                </div>
              )}

              {!!pQuestions.length && !pStarting && (
                <div id="practice-paper" className="space-y-3">
                  <p className="flex items-center justify-between text-sm font-bold">Your paper <span className="text-xs font-normal text-text3">{pAnswered}/{pQuestions.length} answered{pAnswered ? ` · ${pAvg}% avg` : ''}</span></p>
                  {pQuestions.map((x, qi) => (
                    <div key={x.id} className="card">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-text3">Q{qi + 1} · {sectionOf(x.type)} · {typeLabel(x.type)}</p>
                      <p className="mt-1 text-sm"><span className="badge badge-info mr-2">{x.concept} · {x.difficulty}</span></p>
                      <div className="mt-1"><MathText text={x.stem} /></div>
                      {(x.type === 'mcq' || x.type === 'tf') ? (
                        <div className="mt-2 grid gap-1.5">
                          {x.options.map((o, i) => {
                            const right = x.result ? isCorrectOption(x, o) : false;
                            const wrongPick = x.result && !right && o === x.answer;
                            const showLetter = x.type === 'mcq';
                            return (
                            <button key={o} onClick={() => answerPaper(x, o)} disabled={!!x.result || !!answeringId} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm transition hover:border-accent hover:text-accent disabled:cursor-default disabled:hover:border-border disabled:hover:text-text">
                              {showLetter && <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${right ? 'bg-green-500 text-white' : wrongPick ? 'bg-red-500 text-white' : 'bg-surface text-text2'}`}>{String.fromCharCode(65 + i)}</span>}
                              <span>{showLetter ? optionLabel(o, i).slice(3) : o}</span>
                              {right && <span className="ml-auto font-bold text-green-600">✓</span>}
                              {wrongPick && <span className="ml-auto font-bold text-red-500">✕</span>}
                            </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input value={x.answer} onChange={(e) => setPQuestions((qs) => qs.map((y) => (y.id === x.id ? { ...y, answer: e.target.value } : y)))} placeholder={x.type === 'short' ? 'One word or short phrase…' : 'Explain in your own words…'} disabled={!!x.result} className="input flex-1" />
                          <button onClick={() => answerPaper(x)} disabled={!!x.result || !!answeringId} className="btn btn-outline">Submit</button>
                        </div>
                      )}
                      {x.result && (
                        <p className={`alert mt-2 !mb-0 ${x.result.score >= 60 ? 'alert-success' : 'alert-error'}`}>Score {x.result.score} — {x.result.feedback?.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold">Practice history</h3>
                  <button onClick={refreshStats} className="text-xs font-medium text-text3 hover:text-accent">Refresh</button>
                </div>
                {pHistory.length ? (
                  <div className="mt-2 max-h-64 space-y-1 overflow-auto">
                    {pHistory.map((a, i) => (
                      <p key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-bg3 px-3 py-2 text-sm">
                        <span className="font-semibold">Paper #{pHistory.length - i}</span>
                        <span className={`badge ${a.score >= 60 ? 'badge-low' : 'badge-high'}`}>{a.score}%</span>
                        <span className="text-xs text-text3">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text3">No practice papers yet — build your first assignment above.</p>
                )}
              </div>
            </div>
            );
          })()}

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
                <button onClick={() => goTab('tutor')} className="btn btn-outline !py-1.5 !text-xs">Ask tutor →</button>
              </div>
              </div>
            </div>
          )}

          {tab === 'recommendations' && (() => {
            const weak = (adaptive?.weak || []).slice(0, 5);
            const slipping = growth.filter((g) => g.status === 'needs-attention' || (g.delta ?? 0) < 0).slice(0, 3);
            const nextText = adaptive?.current?.text || rec?.text;
            return (
            <div className="mt-4 space-y-4">
              <div>
                <h2 className="font-heading flex items-center gap-2 text-xl font-extrabold"><Compass size={20} className="text-accent" /> Recommendations</h2>
                <p className="text-sm text-text2">Personalized next steps for <b>this project only</b> — rebuilt from your latest quiz, practice and flashcard activity.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Focus concepts <span className="text-xs font-normal text-text3">weakest first</span></h3>
                  {weak.length ? (
                    <div className="mt-2 space-y-2">
                      {weak.map((w) => (
                        <div key={w.concept} className="rounded-xl border border-border bg-bg3 px-3 py-2">
                          <div className="flex justify-between text-sm"><span className="font-semibold">{w.concept}</span><span>{w.score}%</span></div>
                          <div className="mt-1 h-1.5 rounded bg-surface"><div className={`h-1.5 rounded ${w.score < 60 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${w.score}%` }} /></div>
                          <div className="mt-1.5 flex gap-2.5">
                            <button onClick={() => { startQuiz(4, w.concept); goTab('quiz'); }} className="text-[11px] font-bold text-accent hover:underline">Quiz →</button>
                            <button onClick={() => { goTab('tutor'); setTimeout(() => sendText(`Explain ${w.concept} simply with one example from my PDFs`), 300); }} className="text-[11px] font-bold text-accent hover:underline">Ask tutor →</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-sm text-text3">No weak spots flagged yet — take a quiz and they appear here.</p>}
                  {!!adaptive?.dueCards && <p className="mt-2 text-xs text-text2">🃏 {adaptive.dueCards} flashcards due — drill them from the Quiz tab.</p>}
                </div>
                <div className="space-y-4">
                  {!!slipping.length && (
                    <div className="card fade-up">
                      <h3 className="font-heading font-bold">Recover slipping <span className="text-xs font-normal text-text3">scores dropping</span></h3>
                      <div className="mt-2 space-y-1.5 text-sm">
                        {slipping.map((g) => (
                          <p key={g.concept} className="flex items-center justify-between gap-2 rounded-lg bg-bg3 px-2.5 py-1.5">
                            <span className="truncate font-semibold">{g.concept} <span className="badge badge-high ml-1">Δ{g.delta}</span></span>
                            <button onClick={() => { startQuiz(4, g.concept); goTab('quiz'); }} className="shrink-0 text-[11px] font-bold text-accent hover:underline">Recover →</button>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {!!adaptive?.tutorPrompts?.length && (
                    <div className="card fade-up">
                      <h3 className="font-heading font-bold">Ask the tutor <span className="text-xs font-normal text-text3">one tap per weak spot</span></h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {adaptive.tutorPrompts.map((t) => (
                          <button key={t.concept} onClick={() => { goTab('tutor'); setTimeout(() => sendText(t.prompt), 300); }} title={t.prompt} className="rounded-full border border-border bg-bg3 px-2.5 py-1 text-xs hover:border-accent hover:text-accent">Ask: {t.concept}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="card fade-up">
                    <h3 className="font-heading font-bold">Keep momentum</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={refreshStats} className="btn btn-outline !py-1.5 !text-xs">Refresh stats</button>
                      <button onClick={() => goTab('quiz')} className="btn btn-primary !py-1.5 !text-xs">Adaptive quiz →</button>
                      <button onClick={() => goTab('practice')} className="btn btn-outline !py-1.5 !text-xs">Practice paper →</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

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
                          <button onClick={() => { startQuiz(4, m.concept); goTab('quiz'); }} className="text-[11px] font-semibold text-accent hover:underline">Practice →</button>
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

          {tab === 'analytics' && (() => {
            const attempts = analytics?.recentAttempts || [];
            const scores = attempts.map((a) => a.score || 0);
            const best = scores.length ? Math.max(...scores) : 0;
            const quizAtt = attempts.filter((a) => (a.source || 'quiz') !== 'practice');
            const pracAtt = attempts.filter((a) => a.source === 'practice');
            const buckets = [
              { name: 'Struggling (<60)', count: mastery.filter((m) => m.score < 60).length, fill: '#ef4444' },
              { name: 'Developing (60–79)', count: mastery.filter((m) => m.score >= 60 && m.score < 80).length, fill: '#f59e0b' },
              { name: 'Strong (80+)', count: mastery.filter((m) => m.score >= 80).length, fill: '#22c55e' },
            ];
            const byType = {};
            (analytics?.events || []).forEach((e) => { byType[e.type] = (byType[e.type] || 0) + 1; });
            const typeRows = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6)
              .map(([name, count]) => ({ name: name.length > 20 ? `${name.slice(0, 19)}…` : name, count }));
            const maxType = Math.max(1, ...typeRows.map((t) => t.count));
            const kpis = [
              { label: 'Attempts', value: analytics?.attempts ?? 0, sub: `${quizAtt.length} quiz · ${pracAtt.length} practice` },
              { label: 'Avg score', value: `${analytics?.avgScore ?? 0}%`, sub: 'across all attempts' },
              { label: 'Best score', value: scores.length ? `${best}%` : '—', sub: scores.length ? 'personal best' : 'no attempts yet' },
              { label: 'Avg mastery', value: `${avg}%`, sub: `${mastery.length} concepts tracked` },
              { label: 'Quiz rounds', value: quizAtt.length, sub: 'recent-window count' },
              { label: 'Practice papers', value: pracAtt.length, sub: 'recent-window count' },
              { label: 'Tutor chats', value: sessions.length, sub: `${chat.length} messages in open chat` },
              { label: 'Events logged', value: analytics?.events?.length ?? 0, sub: 'learning actions tracked' },
            ];
            return (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-xl font-extrabold">Analytics</h2>
                  <p className="text-sm text-text2">Everything measured in <b>this project only</b> — attempts, scores, mastery distribution and activity.</p>
                </div>
                <button onClick={refreshStats} className="btn btn-outline !py-1.5 !text-xs">Refresh stats</button>
              </div>
              <div className="grid-4 fade-up">
                {kpis.map((k) => (
                  <div key={k.label} className="card" title={k.sub}>
                    <p className="label">{k.label}</p>
                    <p className="font-heading text-3xl font-extrabold">{k.value}</p>
                    <p className="mt-0.5 truncate text-[11px] text-text3">{k.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Score trend <span className="text-xs font-normal text-text3">attempt score over time — rising = learning</span></h3>
                  {attempts.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={attempts.map((a, i) => ({ n: `#${i + 1}`, score: a.score, src: a.source || 'quiz' }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="n" fontSize={11} />
                        <YAxis domain={[0, 100]} fontSize={11} />
                        <Tooltip formatter={(v, _n, p) => [`${v}% (${p?.payload?.src})`, 'score']} />
                        <Line type="monotone" dataKey="score" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="mt-2 text-sm text-text3">No attempts yet — trend appears after your first quiz or practice paper.</p>}
                </div>
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Mastery distribution <span className="text-xs font-normal text-text3">where your concepts sit</span></h3>
                  {mastery.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={buckets} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" fontSize={11} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {buckets.map((b) => <Cell key={b.name} fill={b.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="mt-2 text-sm text-text3">Take a quiz to see struggling / developing / strong splits.</p>}
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Mastery by concept <span className="text-xs font-normal text-text3">weakest first</span></h3>
                  {mastery.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={mastery.slice().sort((a, b) => a.score - b.score).slice(0, 10).map((m) => ({ name: m.concept.slice(0, 12), score: m.score }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} dy={8} height={50} />
                        <YAxis domain={[0, 100]} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="score" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="mt-2 text-sm text-text3">Take a quiz to see mastery bars.</p>}
                </div>
                <div className="card fade-up">
                  <h3 className="font-heading font-bold">Activity by type <span className="text-xs font-normal text-text3">what you do most</span></h3>
                  {typeRows.length ? (
                    <div className="mt-3 space-y-2">
                      {typeRows.map((t) => (
                        <div key={t.name}>
                          <div className="flex justify-between text-xs"><span className="truncate font-semibold">{t.name}</span><b>{t.count}</b></div>
                          <div className="mt-0.5 h-2 rounded-full bg-surface"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(4, Math.round((t.count / maxType) * 100))}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-sm text-text3">No activity yet — quiz, tutor and flashcard actions appear here.</p>}
                </div>
              </div>
              <div className="card">
                <h3 className="font-heading font-bold">Attempt history <span className="text-xs font-normal text-text3">newest first</span></h3>
                {attempts.length ? (
                  <div className="mt-2 max-h-64 space-y-1 overflow-auto">
                    {attempts.slice().reverse().map((a, i) => (
                      <p key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg3 px-3 py-2 text-sm">
                        <span className="font-semibold">Attempt #{attempts.length - i}</span>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">{a.source || 'quiz'}</span>
                        <span className={`badge ${(a.score ?? 0) >= 60 ? 'badge-low' : 'badge-high'}`}>{a.score ?? 0}%</span>
                        <span className="hidden text-xs text-text3 sm:inline">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</span>
                      </p>
                    ))}
                  </div>
                ) : <p className="mt-2 text-sm text-text3">No attempts yet — start from Quiz or Practice.</p>}
              </div>
            </div>
            );
          })()}

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
