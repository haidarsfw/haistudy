export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <h1 className="animate-shimmer bg-gradient-to-r from-primary via-primary/60 to-primary bg-[length:200%_auto] bg-clip-text font-heading text-2xl font-bold text-transparent">
          <span>hai</span>study
        </h1>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </div>
  );
}
