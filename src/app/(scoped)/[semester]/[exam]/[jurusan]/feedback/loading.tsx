export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-4 py-6">
      <div className="h-7 w-44 rounded-lg bg-muted" />
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
