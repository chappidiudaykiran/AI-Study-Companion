import { Trash2 } from 'lucide-react';

// Light reference to Ecurve CourseCard: theme color per id, slim gradient
// accent bar, tag chip, hover lift — without the full banner.
const SPACE_THEMES = [
  { bar: 'from-blue-600 to-indigo-800', tile: 'bg-blue-600', tag: 'bg-blue-600' },
  { bar: 'from-violet-600 to-indigo-800', tile: 'bg-violet-600', tag: 'bg-violet-600' },
  { bar: 'from-cyan-600 to-slate-800', tile: 'bg-cyan-600', tag: 'bg-cyan-600' },
  { bar: 'from-sky-500 to-blue-700', tile: 'bg-sky-600', tag: 'bg-sky-600' },
];

const PROJECT_THEMES = [
  { bar: 'from-emerald-600 to-teal-800', tile: 'bg-emerald-600', tag: 'bg-emerald-600' },
  { bar: 'from-amber-500 to-orange-700', tile: 'bg-amber-600', tag: 'bg-amber-600' },
  { bar: 'from-rose-600 to-red-800', tile: 'bg-rose-600', tag: 'bg-rose-600' },
  { bar: 'from-fuchsia-600 to-pink-800', tile: 'bg-fuchsia-600', tag: 'bg-fuchsia-600' },
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
      <div className={compact ? 'p-5' : 'p-6'}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.tile} text-base font-bold text-white`}>
            {(title || 'S')[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-heading text-[15px] font-bold text-text transition-colors group-hover:text-accent">{title}</h3>
            {meta ? <p className="truncate text-[11px] text-text3">{meta}</p> : null}
          </div>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete && onDelete(); }}
              title="Delete"
              className="rounded-lg p-1.5 text-text3 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {tag && (
          <span className={`mt-3 inline-flex w-fit items-center rounded-md ${theme.tag} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white`}>
            {tag}
          </span>
        )}
        {description && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-text2">{description}</p>}
        {progress !== null && progress !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-surface"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${progress}%` }} /></div>
            <span className="text-[12px] font-bold text-text">{progress}%</span>
          </div>
        )}
        <div className="mt-3 flex items-center border-t border-border/50 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent transition-all group-hover:gap-2.5">
            {openLabel}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}
