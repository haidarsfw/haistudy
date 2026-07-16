"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/language-provider";
import { DemoCursor } from "@/components/landing/demo-cursor";

/* ── unique glyphs (brand gradient). Kept distinct from the other demos:
      no zap (kilat), no summary/AI-sparkle (rangkuman). ── */

/** Window mark: a clipboard with a check (a graded practice sheet). */
function ClipboardCheckGlyph() {
  const id = useId();
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <path
        d="M8 4H6.5A1.5 1.5 0 0 0 5 5.5v14A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 17.5 4H16"
        stroke={`url(#${id})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8.75" y="2.5" width="6.5" height="3.4" rx="1.1" stroke={`url(#${id})`} strokeWidth="1.8" />
      <path
        d="M8.6 13.2l2.3 2.3 4.5-4.7"
        stroke={`url(#${id})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Flashcards side label: two stacked cards. */
function FlashStackGlyph() {
  const id = useId();
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect x="3.2" y="6.5" width="12.5" height="13" rx="2.4" stroke={`url(#${id})`} strokeWidth="1.7" />
      <path
        d="M8 6V5.6A2.1 2.1 0 0 1 10.1 3.5h8.3A2.1 2.1 0 0 1 20.5 5.6v8.3A2.1 2.1 0 0 1 18.4 16H18"
        stroke={`url(#${id})`}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Nilai AI badge spark — a simple 4-point twinkle (distinct from rangkuman's
    8-point). Colour comes from currentColor so it sits in the emerald block. */
function SparkGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l1.6 8.4L22 12l-8.4 1.6L12 22l-1.6-8.4L2 12l8.4-1.6L12 2z" />
    </svg>
  );
}

/** Small check for correct feedback. */
function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  );
}

type Mode = "esai" | "pg" | "flashcards";

const PG_CORRECT = 2; // index of the right IoT answer

// Global pace for the self-playing loop (< 1 = faster), applied to every sleep.
const SPEED = 0.62;

/**
 * "Latihan Soal" demo. One fixed-size, self-playing window split side-by-side:
 * the main pane runs the practice exam — a fake cursor types an essay answer,
 * the AI grade reveals (score + feedback + matched/missed points), then it
 * fades to the multiple-choice drill and picks the right option. The narrow
 * right pane is a self-flipping flashcard (istilah ⇄ definisi). Faithful to the
 * real exam + drill + flashcard flows in the new landing design. Reduced-motion
 * settles on the graded essay.
 */
export function DemoLatihan() {
  const { t, locale } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const esaiTabRef = useRef<HTMLDivElement>(null);
  const pgTabRef = useRef<HTMLDivElement>(null);
  const answerBoxRef = useRef<HTMLDivElement>(null);
  const pgCorrectRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("esai");
  const [fade, setFade] = useState(false);
  const [typed, setTyped] = useState(0);
  const [graded, setGraded] = useState(false);
  const [pgAnswered, setPgAnswered] = useState(false);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, clicking: false, hidden: true });
  // On mobile the flashcard split is dropped; it plays as a 3rd fade step
  // (esai → pg → flashcards → loop) inside the same window instead.
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Only self-play while on screen — both loops below tear down when scrolled away.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const answerWords = t("landing.how.latihan.esai_answer").split(" ");
  const pgOpts = [
    t("landing.how.latihan.pg_o1"),
    t("landing.how.latihan.pg_o2"),
    t("landing.how.latihan.pg_o3"),
    t("landing.how.latihan.pg_o4"),
  ];
  const fcCards = [
    { term: t("landing.how.latihan.fc1_t"), def: t("landing.how.latihan.fc1_d") },
    { term: t("landing.how.latihan.fc2_t"), def: t("landing.how.latihan.fc2_d") },
    { term: t("landing.how.latihan.fc3_t"), def: t("landing.how.latihan.fc3_d") },
    { term: t("landing.how.latihan.fc4_t"), def: t("landing.how.latihan.fc4_d") },
  ];

  // ── main pane: cursor-driven esai → grade → pg → back (bolak-balik) ──
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduce(true);
      setMode("esai");
      setTyped(answerWords.length);
      setGraded(true);
      return;
    }
    if (!active) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = setTimeout(res, ms * SPEED);
        timers.push(id);
      });
    const raf = () => new Promise<void>((res) => requestAnimationFrame(() => res()));

    const clickEl = async (el: HTMLElement | null) => {
      const c = containerRef.current;
      if (!el || !c) return;
      const cr = c.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const x = r.left - cr.left + r.width / 2;
      const y = r.top - cr.top + r.height / 2;
      setCursor((cc) => ({ ...cc, x, y, hidden: false, clicking: false }));
      await sleep(520);
      if (cancelled) return;
      setCursor((cc) => ({ ...cc, clicking: true }));
      await sleep(160);
      setCursor((cc) => ({ ...cc, clicking: false }));
      await sleep(80);
    };

    const hideCursor = () => setCursor((c) => ({ ...c, hidden: true }));

    async function typeAnswer() {
      for (let i = 1; i <= answerWords.length; i++) {
        if (cancelled) return;
        setTyped(i);
        await sleep(65 + Math.random() * 70);
      }
    }

    // Crossfade the main pane to a mode, resetting that mode's state.
    async function swapTo(m: Mode) {
      setFade(true);
      await sleep(230);
      if (cancelled) return;
      setMode(m);
      if (m === "esai") {
        setTyped(0);
        setGraded(false);
      } else if (m === "pg") {
        setPgAnswered(false);
      } else {
        setFcIndex(0);
        setFcFlipped(false);
      }
      await raf();
      await raf();
      if (cancelled) return;
      setFade(false);
      await sleep(140);
    }

    // Flip through a few flashcards in the main pane (the mobile 3rd step).
    async function playFlashcards() {
      for (let k = 0; k < 3; k++) {
        if (cancelled) return;
        setFcIndex(k % fcCards.length);
        setFcFlipped(false);
        await sleep(1000);
        if (cancelled) return;
        setFcFlipped(true);
        await sleep(1450);
        if (cancelled) return;
        setFcFlipped(false);
        await sleep(380);
      }
    }

    async function run() {
      await sleep(600);
      while (!cancelled) {
        // ESAI — type the answer, then reveal the AI grade
        await clickEl(answerBoxRef.current);
        if (cancelled) return;
        await typeAnswer();
        if (cancelled) return;
        hideCursor();
        await sleep(430);
        setGraded(true);
        await sleep(3000);
        if (cancelled) return;

        // → PILIHAN GANDA
        await clickEl(pgTabRef.current);
        if (cancelled) return;
        await swapTo("pg");
        await sleep(950);
        await clickEl(pgCorrectRef.current);
        if (cancelled) return;
        setPgAnswered(true);
        await sleep(280);
        hideCursor();
        await sleep(3000);
        if (cancelled) return;

        if (isMobile) {
          // → FLASHCARDS (sequential fade-in), then back to the start
          await swapTo("flashcards");
          await playFlashcards();
          if (cancelled) return;
          await swapTo("esai");
        } else {
          // → back to ESAI (bolak-balik; flashcards live in the side pane)
          await clickEl(esaiTabRef.current);
          if (cancelled) return;
          await swapTo("esai");
        }
        await sleep(500);
      }
    }

    run();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, isMobile, active]);

  // ── flashcard side pane: independent, calm self-flip (desktop only; on
  //    mobile the flashcards play inside the main loop as a 3rd step) ──
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (isMobile) return;
    if (!active) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = setTimeout(res, ms * SPEED);
        timers.push(id);
      });

    async function cycle() {
      await sleep(1300);
      while (!cancelled) {
        await sleep(1900); // read the term
        if (cancelled) return;
        setFcFlipped(true); // flip to definition
        await sleep(2300);
        if (cancelled) return;
        setFcFlipped(false); // flip back
        await sleep(650);
        if (cancelled) return;
        setFcIndex((i) => (i + 1) % fcCards.length); // next card
        await sleep(300);
      }
    }
    cycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, isMobile, active]);

  const typing = typed > 0 && typed < answerWords.length;
  const answerText = answerWords.slice(0, typed).join(" ");
  const fc = fcCards[fcIndex];

  const seg =
    "cursor-default select-none rounded-full px-3 py-1 text-[12px] font-semibold transition-colors";

  return (
    <div
      ref={containerRef}
      className="relative flex h-[480px] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:h-[440px]"
    >
      {/* header (full width) */}
      <div className="flex items-center gap-2.5 border-b border-border/70 px-5 py-3">
        <ClipboardCheckGlyph />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold leading-tight text-foreground">
            {t("landing.how.latihan.tag")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t("landing.how.latihan.subject")}
          </p>
        </div>
      </div>

      {/* body: split kesamping (main exam/drill + flashcard side) */}
      <div className="flex min-h-0 flex-1">
        {/* MAIN pane */}
        <div className="flex min-w-0 flex-1 flex-col border-border/70 sm:border-r">
          {/* segmented toggle */}
          <div className="px-4 pt-3">
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
              <div
                ref={esaiTabRef}
                className={cn(
                  seg,
                  mode === "esai"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t("landing.how.latihan.tab_esai")}
              </div>
              <div
                ref={pgTabRef}
                className={cn(
                  seg,
                  mode === "pg"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t("landing.how.latihan.tab_pg")}
              </div>
              {/* Flashcards is a side pane on desktop; on mobile it becomes a
                  third tab the loop fades to, so only show it there. */}
              <div
                className={cn(
                  seg,
                  "sm:hidden",
                  mode === "flashcards"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t("landing.how.latihan.fc_label")}
              </div>
            </div>
          </div>

          {/* content crossfade */}
          <div className="relative min-h-0 flex-1 overflow-hidden px-4 pb-3 pt-2.5">
            <div
              className="h-full transition-opacity duration-300"
              style={{ opacity: fade ? 0 : 1 }}
            >
              {mode === "esai" ? (
                <div className="flex h-full flex-col">
                  <span className="inline-flex w-fit items-center rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {t("landing.how.latihan.esai_label")}
                  </span>
                  <p className="mt-2 text-[13px] font-medium leading-snug text-foreground">
                    {t("landing.how.latihan.esai_q")}
                  </p>

                  {/* answer box (fake-typed) */}
                  <div
                    ref={answerBoxRef}
                    className="mt-2.5 min-h-[60px] rounded-xl border border-border bg-background px-3 py-2 text-[13px] leading-relaxed"
                  >
                    {typed === 0 ? (
                      <span className="text-muted-foreground/60">
                        {t("landing.how.latihan.esai_placeholder")}
                      </span>
                    ) : (
                      <span className="text-foreground/90">
                        {answerText}
                        {typing && (
                          <span className="ml-0.5 inline-block h-[15px] w-[2px] -translate-y-[1px] animate-pulse bg-primary align-middle" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* AI grade reveal */}
                  <div
                    className={cn(
                      "mt-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 transition-all duration-500",
                      graded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide hs-demo-ok">
                        <SparkGlyph />
                        {t("landing.how.latihan.esai_grade_label")}
                      </span>
                      <span className="font-display text-lg font-bold tabular-nums hs-demo-ok">
                        27
                        <span className="text-sm text-muted-foreground">/30</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/85">
                      {t("landing.how.latihan.esai_feedback")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip kind="hit">{t("landing.how.latihan.esai_hit1")}</Chip>
                      <Chip kind="hit">{t("landing.how.latihan.esai_hit2")}</Chip>
                      <Chip kind="miss">{t("landing.how.latihan.esai_miss1")}</Chip>
                    </div>
                  </div>
                </div>
              ) : mode === "pg" ? (
                <div className="flex h-full flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("landing.how.latihan.pg_cat")}
                  </span>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
                    {t("landing.how.latihan.pg_q")}
                  </p>

                  <div className="mt-2 flex flex-col gap-1">
                    {pgOpts.map((opt, i) => {
                      const correct = i === PG_CORRECT;
                      const state = !pgAnswered ? "idle" : correct ? "correct" : "dim";
                      return (
                        <div
                          key={i}
                          ref={correct ? pgCorrectRef : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-[12px] leading-snug transition-colors duration-300",
                            state === "idle" && "border-border bg-card/60 text-foreground",
                            state === "correct" &&
                              "border-emerald-500/50 bg-emerald-500/10 font-semibold hs-demo-ok",
                            state === "dim" &&
                              "border-border bg-card/40 text-muted-foreground opacity-50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                              state === "correct"
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {state === "correct" && (
                            <CheckGlyph className="shrink-0 hs-demo-ok" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* explanation reveal */}
                  <div
                    className={cn(
                      "mt-2 rounded-xl border border-border bg-muted/40 p-2.5 transition-all duration-500",
                      pgAnswered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("landing.how.latihan.pg_explain_label")}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/85">
                      {t("landing.how.latihan.pg_explain")}
                    </p>
                  </div>
                </div>
              ) : (
                // flashcards — mobile-only 3rd step (fades in after PG)
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="perspective-1200 w-full max-w-[260px]">
                    <div
                      className={cn(
                        "flashcard-flip preserve-3d relative h-[188px] w-full",
                        fcFlipped && "is-flipped"
                      )}
                    >
                      <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-center shadow-sm">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("landing.how.latihan.fc_front")}
                        </span>
                        <span className="font-display text-lg font-bold leading-snug text-foreground">
                          {fc.term}
                        </span>
                      </div>
                      <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 text-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {t("landing.how.latihan.fc_back")}
                        </span>
                        <span className="text-[13px] leading-snug text-foreground/85">{fc.def}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {fcIndex + 1} / {fcCards.length}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FLASHCARD side pane (the "dibelah kesamping" split) — hidden on
            mobile so the exam gets full width and nothing collides. */}
        <div className="hidden w-[36%] max-w-[220px] shrink-0 flex-col px-3 py-3 sm:flex">
          <div className="mb-2 flex items-center gap-1.5">
            <FlashStackGlyph />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("landing.how.latihan.fc_label")}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5">
            <div className="perspective-1200 w-full">
              <div
                className={cn(
                  "flashcard-flip preserve-3d relative h-[150px] w-full",
                  fcFlipped && "is-flipped"
                )}
              >
                {/* front — istilah */}
                <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-center shadow-sm">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("landing.how.latihan.fc_front")}
                  </span>
                  <span className="font-display text-sm font-bold leading-snug text-foreground">
                    {fc.term}
                  </span>
                </div>
                {/* back — definisi */}
                <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3 text-center">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">
                    {t("landing.how.latihan.fc_back")}
                  </span>
                  <span className="text-[11px] leading-snug text-foreground/85">{fc.def}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {fcIndex + 1} / {fcCards.length}
            </p>
          </div>
        </div>
      </div>

      {!reduce && (
        <DemoCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} hidden={cursor.hidden} />
      )}
      <span className="sr-only">{t("landing.how.latihan.sr")}</span>
    </div>
  );
}

function Chip({ kind, children }: { kind: "hit" | "miss"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        kind === "hit"
          ? "bg-emerald-500/15 hs-demo-ok"
          : "bg-amber-500/15 hs-demo-warn"
      )}
    >
      <span aria-hidden="true">{kind === "hit" ? "✓" : "−"}</span>
      {children}
    </span>
  );
}
