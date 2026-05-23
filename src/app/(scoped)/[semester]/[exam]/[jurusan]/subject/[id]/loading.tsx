export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6 animate-pulse">
      <div className="h-10 w-2/3 rounded-lg bg-muted" />
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 shrink-0 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
