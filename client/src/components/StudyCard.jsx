import { Trash2 } from 'lucide-react';

// Light Ecurve-inspired card: slim gradient accent bar, soft icon tile,
// clear title + sub text, divider, split footer. Compact density everywhere.
const SPACE_THEMES = [
  { bar: 'from-blue-600 to-indigo-800', soft: 'bg-blue-600/10 text-blue-700 dark:text-blue-300' },
  { bar: 'from-violet-600 to-indigo-800', soft: 'bg-violet-600/10 text-violet-700 dark:text-violet-300' },
  { bar: 'from-cyan-600 to-slate-800', soft: 'bg-cyan-600/10 text-cyan-700 dark:text-cyan-300' },
  { bar: 'from-sky-500 to-blue-700', soft: 'bg-sky-600/10 text-sky-700 dark:text-sky-300' },
];

const PROJECT_THEMES = [
  { bar: 'from-emerald-600 to-teal-800', soft: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300' },
  { bar: 'from-amber-500 to-orange-700', soft: 'bg-amber-600/10 text-amber-700 dark:text-amber-300' },
  { bar: 'from-rose-600 to-red-800', soft: 'bg-rose-600/10 text-rose-700 dark:text-rose-300' },
  { bar: 'from-fuchsia-600 to-pink-800', soft: 'bg-fuchsia-600/10 text-fuchsia-700 dark:text-fuchsia-300' },
];

function themeFor(id, index, palette = 'project') {
  const arr = palette === 'space' ? SPACE_THEMES : PROJECT_THEMES;
  let i = index % arr.length;
  if (id) {
    const parsed = parseInt(String(id).slice(-4), 16);
    i = (isNaN(parsed) ? index : parsed) % arr.length;
  }
  return arr[i] || arr[0];
}

export default function StudyCard({
  id, index = 0, title, tag, description, meta = '',
  progress = null, openLabel = 'Open', onOpen,
  canDelete = false, onDelete, confirmText = 'Delete this item? This cannot be undone.',
  compact = false, palette = 'project',
}) {
  const theme = themeFor(id, index, palette);
  return (
    <div
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-bg2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      onClick={onOpen}
    >
      <div className={`h-1.5 bg-gradient-to-r ${theme.bar}`} />
      <div className="p-6">
        <div className="flex items-center gap-4">
          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${theme.soft}`}>
            {(title || 'S')[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-heading text-lg font-bold text-text transition-colors group-hover:text-accent">{title}</h3>
            {(tag || meta) && <p className="truncate text-[13px] text-text2">{tag || meta}</p>}
          </div>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete && onDelete(); }}
              title="Delete"
              className="shrink-0 rounded-lg p-2 text-text3 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
        {description && <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-text2">{description}</p>}
        {progress !== null && progress !== undefined && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-surface"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${progress}%` }} /></div>
            <span className="text-[13px] font-bold text-text">{progress}%</span>
          </div>
        )}
        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="text-[13px] text-text2">{meta}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-all group-hover:gap-2.5">
            {openLabel}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}
