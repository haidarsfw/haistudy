export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6 px-4 py-6">
      <div className="h-7 w-40 rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
