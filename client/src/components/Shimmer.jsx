// Reusable shimmer (skeleton) loading placeholders used app-wide.
// Every async surface shows these while its data is loading.

export function Skel({ className = '' }) {
  return <div aria-hidden className={`shimmer rounded-lg ${className}`} />;
}

export function TextLines({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skel key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

// Stat cards row (overview / dashboard / admin)
export function StatCards({ count = 4 }) {
  return (
    <div className="grid-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <Skel className="h-3 w-1/2" />
          <Skel className="mt-2 h-8 w-1/3" />
        </div>
      ))}
    </div>
  );
}

// Generic content cards (spaces / projects / concepts / jobs)
export function CardList({ count = 3 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <div className="flex items-center gap-3">
            <Skel className="h-10 w-10 !rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skel className="h-4 w-2/3" />
              <Skel className="h-3 w-1/2" />
            </div>
          </div>
          <Skel className="mt-3 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

// Chat-style thread (tutor / quiz): alternating bubbles
export function ChatThread({ rows = 3 }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        i % 2 === 0 ? (
          <div key={i} className="flex gap-2">
            <Skel className="h-7 w-7 shrink-0 !rounded-full" />
            <div className="w-3/4 space-y-2 rounded-2xl rounded-bl-sm border border-border bg-bg2 p-3">
              <Skel className="h-3 w-1/4" />
              <Skel className="h-3 w-full" />
              <Skel className="h-3 w-5/6" />
              <Skel className="h-3 w-2/3" />
            </div>
          </div>
        ) : (
          <div key={i} className="flex justify-end">
            <Skel className="h-10 w-1/2 !rounded-2xl" />
          </div>
        )
      ))}
    </div>
  );
}

// Left-list panel rows (saved chats / quizzes / sessions)
export function ListRows({ count = 4 }) {
  return (
    <div className="space-y-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-1.5 rounded-xl px-2 py-1">
          <Skel className="h-3.5 w-4/5" />
          <Skel className="h-2.5 w-3/5" />
        </div>
      ))}
    </div>
  );
}

// Full page boot skeleton (project / dashboard / analytics)
export function PageSkeleton({ stats = 4, cards = 2 }) {
  return (
    <div className="container space-y-4 pt-6" aria-label="Loading">
      <Skel className="h-4 w-64" />
      <StatCards count={stats} />
      <div className="card">
        <Skel className="h-5 w-48" />
        <div className="mt-3"><TextLines lines={4} /></div>
      </div>
      {!!cards && <CardList count={cards} />}
    </div>
  );
}
