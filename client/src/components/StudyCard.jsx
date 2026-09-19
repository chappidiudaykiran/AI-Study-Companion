import { Trash2 } from 'lucide-react';

// Adapted from Ecurve CourseCard: gradient banner + tag chip + details + footer.
// Stable theme per id so a card keeps its color across lists.
const DESIGNS = [
  {
    gradient: 'from-emerald-600 to-teal-900', tagColor: 'bg-emerald-600',
    icon: (<svg className="absolute -right-2 -top-2 h-40 w-40 text-white opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" /></svg>),
  },
  {
    gradient: 'from-rose-700 to-red-950', tagColor: 'bg-rose-600',
    icon: (<svg className="absolute -right-4 -top-4 h-44 w-44 text-white opacity-10 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>),
  },
  {
    gradient: 'from-blue-600 to-indigo-900', tagColor: 'bg-blue-600',
    icon: (<svg className="absolute -right-6 -top-2 h-44 w-44 text-white opacity-10 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>),
  },
  {
    gradient: 'from-purple-600 to-fuchsia-900', tagColor: 'bg-purple-600',
    icon: (<svg className="absolute -right-6 top-0 h-44 w-44 text-white opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>),
  },
  {
    gradient: 'from-amber-500 to-orange-800', tagColor: 'bg-amber-600',
    icon: (<svg className="absolute -right-2 -top-2 h-40 w-40 text-white opacity-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 group-hover:opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>),
  },
  {
    gradient: 'from-cyan-600 to-slate-900', tagColor: 'bg-cyan-600',
    icon: (<svg className="absolute -right-4 -top-2 h-40 w-40 text-white opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
  },
];

function themeFor(id, index) {
  let i = index % DESIGNS.length;
  if (id) {
    const parsed = parseInt(String(id).slice(-4), 16);
    i = (isNaN(parsed) ? index : parsed) % DESIGNS.length;
  }
  return DESIGNS[i] || DESIGNS[0];
}

export default function StudyCard({
  id, index = 0, title, tag, description, meta = '',
  progress = null, openLabel = 'Open', onOpen,
  canDelete = false, onDelete, confirmText = 'Delete this item? This cannot be undone.',
  compact = false,
}) {
  const design = themeFor(id, index);
  return (
    <div
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-border bg-bg2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      onClick={onOpen}
    >
      <div className={`relative ${compact ? 'h-28' : 'h-36'} overflow-hidden bg-gradient-to-br p-5 ${design.gradient}`}>
        {design.icon}
        <div className="relative z-10 flex h-full flex-col justify-end text-white">
          <h2 className={`mb-2 truncate font-heading font-extrabold leading-tight tracking-tight drop-shadow-md ${compact ? 'text-lg' : 'text-xl'}`}>{title}</h2>
          {tag && (
            <div className={`flex w-fit items-center gap-1.5 rounded-md ${design.tagColor} px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-white/20`}>
              {tag}
            </div>
          )}
        </div>
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete && onDelete(); }}
            title="Delete"
            className="absolute right-3 top-3 z-20 rounded-lg bg-black/25 p-1.5 text-white/80 transition hover:bg-black/45 hover:text-white"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <h3 className="mb-1 truncate font-heading text-[15px] font-bold text-text transition-colors group-hover:text-accent">{title}</h3>
          {description && <p className="mb-2 line-clamp-2 text-[12px] leading-relaxed text-text2">{description}</p>}
          {meta && <p className="text-[11px] text-text3">{meta}</p>}
          {progress !== null && progress !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-surface"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${progress}%` }} /></div>
              <span className="text-[12px] font-bold text-text">{progress}%</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent transition-all group-hover:gap-2.5">
            {openLabel}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}
