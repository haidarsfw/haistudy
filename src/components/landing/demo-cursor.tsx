"use client";

/**
 * A fake pointer for the self-playing landing demos. Positioned absolutely
 * inside a `relative` demo container; `x`/`y` are the target center in px
 * relative to that container. Movement is a GPU-cheap translate with a smooth
 * glide; `clicking` triggers a quick press + ripple. Purely decorative
 * (aria-hidden) and never rendered under prefers-reduced-motion.
 */
export function DemoCursor({
  x,
  y,
  clicking,
  hidden,
}: {
  x: number;
  y: number;
  clicking?: boolean;
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-30 transition-[transform,opacity] duration-[360ms] [transition-timing-function:cubic-bezier(0.33,1,0.68,1)]"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        opacity: hidden ? 0 : 1,
      }}
    >
      <div className="relative -translate-x-[3px] -translate-y-[2px]">
        {/* click ripple */}
        <span
          className={`absolute left-0 top-0 -ml-2 -mt-2 h-8 w-8 rounded-full bg-primary/25 transition-all duration-300 ease-out ${
            clicking ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
        />
        {/* pointer */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className={`relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition-transform duration-150 ${
            clicking ? "scale-90" : "scale-100"
          }`}
        >
          <path
            d="M5 2.5l14.5 7.2-6.1 1.9-1.9 6.2L5 2.5z"
            fill="#ffffff"
            stroke="#0c1512"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
