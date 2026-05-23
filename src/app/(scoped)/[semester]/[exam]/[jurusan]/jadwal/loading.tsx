export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6 animate-pulse">
      <div className="h-10 w-1/2 rounded-lg bg-muted" />
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
