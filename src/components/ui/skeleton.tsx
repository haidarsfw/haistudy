import { cn } from "@/lib/utils";

// Shadcn-style skeleton primitive. Compose with Tailwind sizing utilities
// (h-*, w-*, rounded-*) at the call site so each skeleton matches the shape
// of whatever it's temporarily replacing.
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
