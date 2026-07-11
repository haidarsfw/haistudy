"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import Lenis from "lenis";

type Resolved = "light" | "dark";
type Choice = "light" | "dark";

const LandingThemeCtx = createContext<{ resolved: Resolved; toggle: () => void }>(
  { resolved: "light", toggle: () => {} }
);
export const useLandingTheme = () => useContext(LandingThemeCtx);

/**
 * Landing runtime + theming. Owns the `.landing-root` scope so it can set
 * `data-theme` for the manual light/dark toggle (default = follow system via
 * CSS media query, no attr). Also mounts Lenis smooth scroll + a scroll-reveal
 * observer. All disabled under prefers-reduced-motion.
 */
export function LandingShell({ children }: { children: React.ReactNode }) {
  // Default = dark for every visitor; a manual toggle choice persists.
  const [choice, setChoice] = useState<Choice>("dark");

  useEffect(() => {
    try {
      const s = localStorage.getItem("hs-landing-theme");
      if (s === "light" || s === "dark") setChoice(s);
    } catch {
      /* ignore */
    }
  }, []);

  const resolved: Resolved = choice;
  const toggle = () => {
    const next: Choice = choice === "dark" ? "light" : "dark";
    setChoice(next);
    try {
      localStorage.setItem("hs-landing-theme", next);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rootEl = document.querySelector<HTMLElement>(".landing-root");
    // Kill scroll anchoring across the landing (the self-playing demos + Lenis
    // can otherwise nudge the page on their own). Set inline so Lightning CSS
    // can't strip it the way it drops the `overflow-anchor` CSS property.
    rootEl?.style.setProperty("overflow-anchor", "none");
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    let io: IntersectionObserver | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    if (reduce) {
      els.forEach((el) => el.classList.add("is-visible"));
    } else {
      // Enable the hidden→reveal animation only now (JS ran). Content is
      // visible by default otherwise, so nothing can get stuck invisible.
      rootEl?.classList.add("reveal-ready");
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
              io?.unobserve(e.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
      );
      const vh = window.innerHeight;
      els.forEach((el) => {
        // Above-the-fold reveals immediately — no dependence on the observer,
        // which browsers throttle/pause in background tabs.
        if (el.getBoundingClientRect().top < vh * 0.92) {
          el.classList.add("is-visible");
        } else {
          io!.observe(el);
        }
      });
      // Safety net: never leave anything hidden.
      fallbackTimer = setTimeout(
        () => els.forEach((el) => el.classList.add("is-visible")),
        1600
      );
    }

    if (reduce) return () => io?.disconnect();

    const lenis = new Lenis({
      lerp: 0.16,
      wheelMultiplier: 1,
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // In-page anchor jumps: a calm, deliberate glide (not too fast), and rapid
    // back-and-forth clicks cancel + restart smoothly.
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement).closest?.(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (target) {
        ev.preventDefault();
        lenis.scrollTo(target as HTMLElement, {
          offset: -96,
          duration: 1.2,
          easing: (t) => 1 - Math.pow(1 - t, 4), // ease-out quart
        });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      lenis.destroy();
      io?.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <LandingThemeCtx.Provider value={{ resolved, toggle }}>
      <div
        className={`landing-root theme-${choice} min-h-screen bg-background text-foreground`}
      >
        {children}
      </div>
    </LandingThemeCtx.Provider>
  );
}
