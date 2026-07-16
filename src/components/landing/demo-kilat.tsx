"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/language-provider";
import { DemoCursor } from "@/components/landing/demo-cursor";

/* ── unique glyphs (brand gradient). Only the reading cards (materi / skenario)
      carry one; quiz / match / true-false / score are icon-free. ── */

/** Materi: a lightbulb (an idea to take in). */
function MateriGlyph() {
  const id = useId();
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <path
        d="M9 18h6M10 21h4"
        stroke={`url(#${id})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 3a6 6 0 0 0-3.8 10.6c.5.4.8 1 .9 1.7l.1.7h5.6l.1-.7c.1-.7.4-1.3.9-1.7A6 6 0 0 0 12 3Z"
        stroke={`url(#${id})`}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Skenario: a forking path (a decision with branches). */
function SkenarioGlyph() {
  const id = useId();
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <path
        d="M12 21v-6M12 15 6.5 6.2M12 15l5.5-8.8"
        stroke={`url(#${id})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="21" r="1.6" fill={`url(#${id})`} />
      <circle cx="6" cy="5" r="1.9" fill={`url(#${id})`} />
      <circle cx="18" cy="5" r="1.9" fill={`url(#${id})`} />
    </svg>
  );
}

/** Belajar Kilat widget mark: a lightning bolt (flash learning). */
function ZapGlyph() {
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
        d="M13.2 2.2 5.6 12.6a.7.7 0 0 0 .56 1.11h4.13l-1.2 8.02a.35.35 0 0 0 .63.26l7.65-10.42a.7.7 0 0 0-.56-1.11h-4.16l1.2-8a.35.35 0 0 0-.63-.26Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

/** A small check used inside the correct-answer feedback. */
function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
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

/** Up arrow for the "swipe up" hint. */
function ArrowUpGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

/* ── shared bits ── */

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
      {children}
    </span>
  );
}

type OptState = "idle" | "correct" | "dim";
function Opt({
  label,
  state,
  innerRef,
}: {
  label: string;
  state: OptState;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      className={cn(
        "rounded-xl border px-4 py-2.5 text-sm leading-snug transition-colors duration-300",
        state === "idle" && "border-border bg-card/60 text-foreground",
        state === "correct" &&
          "border-emerald-500/50 bg-emerald-500/10 font-semibold hs-demo-ok",
        state === "dim" && "border-border bg-card/40 text-muted-foreground opacity-50"
      )}
    >
      {label}
    </div>
  );
}

function Feedback({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[13px] leading-relaxed hs-demo-ok">
      <CheckGlyph className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Global pace for the self-playing loop (< 1 = faster). Applied uniformly to
// every sleep so relative timing (and anything that must stay in sync) holds.
const SPEED = 0.62;

// Steps in the self-playing feed.
const STEP = {
  materi: 0,
  skenario: 1,
  cocok: 2,
  bs: 3,
  nilai: 4,
} as const;

// Progress bar fill per step (reaches 100% at the score card).
const PROGRESS = [20, 40, 65, 85, 100];

// Definition column order (index into the pairs) so it isn't row-aligned.
const DEF_ORDER = [2, 0, 1];

/**
 * "Belajar Kilat" demo. One fixed-size, self-playing feed window: a fake cursor
 * drags each card up (the signature swipe), then answers a scenario, a quiz,
 * a word-match and a true/false round, ending on the final score. Faithful to
 * the real feed's card types in the new landing design (no phone chrome, no
 * running score chrome). Reduced-motion = a settled "passed" state.
 */
export function DemoKilat() {
  const { t, locale } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const choiceRef = useRef<HTMLDivElement>(null);
  const matchGridRef = useRef<HTMLDivElement>(null);
  const termRefs = useRef<(HTMLDivElement | null)[]>([]);
  const defRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tfTrueRef = useRef<HTMLDivElement>(null);
  const tfFalseRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<number>(STEP.materi);
  const [answered, setAnswered] = useState(false);
  const [matched, setMatched] = useState<number[]>([]);
  const [selTerm, setSelTerm] = useState<number | null>(null);
  const [tfIdx, setTfIdx] = useState(0);
  const [tfFlash, setTfFlash] = useState<"true" | "false" | null>(null);
  const [progress, setProgress] = useState(PROGRESS[0]);
  const [hint, setHint] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, clicking: false, hidden: true });
  const [cardT, setCardT] = useState<{ y: number; opacity: number; animate: boolean }>({
    y: 0,
    opacity: 1,
    animate: false,
  });
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [active, setActive] = useState(false);

  const scenarioOpts = [
    t("landing.how.kilat.c2_opt1"),
    t("landing.how.kilat.c2_opt2"),
    t("landing.how.kilat.c2_opt3"),
  ];
  const pairs = [
    { term: t("landing.how.kilat.c4_t1"), def: t("landing.how.kilat.c4_d1") },
    { term: t("landing.how.kilat.c4_t2"), def: t("landing.how.kilat.c4_d2") },
    { term: t("landing.how.kilat.c4_t3"), def: t("landing.how.kilat.c4_d3") },
  ];
  const tf = [
    { text: t("landing.how.kilat.c5_s1"), answer: true },
    { text: t("landing.how.kilat.c5_s2"), answer: false },
  ];

  // Only self-play while on screen — the loop tears down when scrolled away.
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

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduce(true);
      setStep(STEP.nilai);
      setProgress(100);
      setAnswered(true);
      setMatched([0, 1, 2]);
      setTfIdx(2);
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

    const feedBox = () => {
      const c = containerRef.current;
      const f = feedRef.current;
      if (!c || !f) return null;
      const cr = c.getBoundingClientRect();
      const fr = f.getBoundingClientRect();
      return { left: fr.left - cr.left, top: fr.top - cr.top, w: fr.width, h: fr.height };
    };

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

    const resetCard = () => {
      setAnswered(false);
      setMatched([]);
      setSelTerm(null);
      setTfIdx(0);
      setTfFlash(null);
    };

    async function enterCard(next: number, prog: number) {
      setStep(next);
      resetCard();
      setProgress(prog);
      setCardT({ y: 64, opacity: 0, animate: false });
      await raf();
      await raf();
      if (cancelled) return;
      setCardT({ y: 0, opacity: 1, animate: true });
      await sleep(440);
    }

    // Cursor grabs the card and drags it up; it leaves upward (the signature
    // swipe). The caller then enters the next card from below.
    async function dragUp() {
      const fb = feedBox();
      const gx = fb ? fb.left + fb.w / 2 : 0;
      const gy = fb ? fb.top + fb.h * 0.62 : 0;
      setCursor((c) => ({ ...c, x: gx, y: gy, hidden: false, clicking: false }));
      await sleep(500);
      if (cancelled) return;
      setCursor((c) => ({ ...c, clicking: true }));
      await sleep(150);
      if (cancelled) return;
      setCursor((c) => ({ ...c, y: gy - 150 }));
      setCardT({ y: -150, opacity: 0, animate: true });
      await sleep(360);
      if (cancelled) return;
      setCursor((c) => ({ ...c, clicking: false, hidden: true }));
    }

    async function answerChoice() {
      await clickEl(choiceRef.current);
      if (cancelled) return;
      setAnswered(true);
      await sleep(240);
      setCursor((c) => ({ ...c, hidden: true }));
    }

    async function doMatch() {
      for (let i = 0; i < pairs.length; i++) {
        if (cancelled) return;
        await clickEl(termRefs.current[i]);
        if (cancelled) return;
        setSelTerm(i);
        await sleep(220);
        const pos = DEF_ORDER.indexOf(i);
        await clickEl(defRefs.current[pos]);
        if (cancelled) return;
        setMatched((m) => [...m, i]);
        setSelTerm(null);
        await sleep(340);
      }
      setCursor((c) => ({ ...c, hidden: true }));
    }

    async function doTF() {
      for (let i = 0; i < tf.length; i++) {
        if (cancelled) return;
        setTfIdx(i);
        await sleep(460);
        const ref = tf[i].answer ? tfTrueRef : tfFalseRef;
        await clickEl(ref.current);
        if (cancelled) return;
        setTfFlash(tf[i].answer ? "true" : "false");
        await sleep(420);
        setTfFlash(null);
        setTfIdx(i + 1);
        await sleep(220);
      }
      setCursor((c) => ({ ...c, hidden: true }));
    }

    async function run() {
      while (!cancelled) {
        // materi
        await enterCard(STEP.materi, PROGRESS[0]);
        if (cancelled) return;
        setHint(true);
        await sleep(1900);
        if (cancelled) return;
        setHint(false);
        await dragUp();
        if (cancelled) return;

        // skenario
        await enterCard(STEP.skenario, PROGRESS[1]);
        if (cancelled) return;
        await sleep(900);
        await answerChoice();
        if (cancelled) return;
        await sleep(2300);
        await dragUp();
        if (cancelled) return;

        // cocokkan kata
        await enterCard(STEP.cocok, PROGRESS[2]);
        if (cancelled) return;
        await sleep(700);
        await doMatch();
        if (cancelled) return;
        await sleep(1100);
        await dragUp();
        if (cancelled) return;

        // benar / salah
        await enterCard(STEP.bs, PROGRESS[3]);
        if (cancelled) return;
        await sleep(700);
        await doTF();
        if (cancelled) return;
        await sleep(1200);
        await dragUp();
        if (cancelled) return;

        // nilai akhir
        await enterCard(STEP.nilai, PROGRESS[4]);
        if (cancelled) return;
        await sleep(3400);
        await dragUp();
        if (cancelled) return;
        await sleep(300);
      }
    }

    run();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, active]);

  // Connector lines for matched pairs, measured relative to the match grid so
  // the card's translate never offsets them.
  useEffect(() => {
    if (step !== STEP.cocok) {
      setLines([]);
      return;
    }
    const measure = () => {
      const g = matchGridRef.current;
      if (!g) return;
      const gb = g.getBoundingClientRect();
      const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
      matched.forEach((i) => {
        const pos = DEF_ORDER.indexOf(i);
        const te = termRefs.current[i];
        const de = defRefs.current[pos];
        if (!te || !de) return;
        const tb = te.getBoundingClientRect();
        const db = de.getBoundingClientRect();
        out.push({
          x1: tb.right - gb.left,
          y1: tb.top + tb.height / 2 - gb.top,
          x2: db.left - gb.left,
          y2: db.top + db.height / 2 - gb.top,
        });
      });
      setLines(out);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [matched, step]);

  const cardStyle: React.CSSProperties = {
    transform: `translateY(${cardT.y}px)`,
    opacity: cardT.opacity,
    transition: cardT.animate
      ? "transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s cubic-bezier(0.22,1,0.36,1)"
      : "none",
  };

  const box =
    "flex min-h-[52px] items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] leading-snug transition-colors duration-300";

  return (
    <div
      ref={containerRef}
      className="relative flex h-[480px] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:h-[440px]"
    >
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-border/70 px-5 py-3">
        <ZapGlyph />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold leading-tight text-foreground">
            {t("landing.how.kilat.tag")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t("landing.how.kilat.subject")} {"·"} {t("landing.how.kilat.chapter")}
          </p>
        </div>
      </div>

      {/* progress */}
      <div className="px-5 pt-3.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* feed */}
      <div ref={feedRef} className="relative flex-1 overflow-hidden px-5">
        <div className="flex h-full items-center">
          <div style={cardStyle} className="w-full">
            {step === STEP.materi && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <MateriGlyph />
                  </span>
                  <Tag>{t("landing.how.kilat.c1_tag")}</Tag>
                </div>
                <h3 className="font-display text-lg font-bold leading-snug text-foreground sm:text-xl">
                  {t("landing.how.kilat.c1_heading")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("landing.how.kilat.c1_body")}
                </p>
              </div>
            )}

            {step === STEP.skenario && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <SkenarioGlyph />
                  </span>
                  <Tag>{t("landing.how.kilat.c2_tag")}</Tag>
                </div>
                <p className="text-[15px] font-semibold leading-relaxed text-foreground">
                  {t("landing.how.kilat.c2_situation")}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {scenarioOpts.map((opt, i) => (
                    <Opt
                      key={i}
                      label={opt}
                      state={!answered ? "idle" : i === 0 ? "correct" : "dim"}
                      innerRef={i === 0 ? choiceRef : undefined}
                    />
                  ))}
                </div>
                {answered && <Feedback>{t("landing.how.kilat.c2_feedback")}</Feedback>}
              </div>
            )}

            {step === STEP.cocok && (
              <div>
                <div className="mb-3">
                  <Tag>{t("landing.how.kilat.c4_tag")}</Tag>
                </div>
                <h3 className="font-display text-base font-bold leading-snug text-foreground">
                  {t("landing.how.kilat.c4_prompt")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("landing.how.kilat.c4_hint")}</p>
                <div ref={matchGridRef} className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                    {lines.map((l, i) => (
                      <line
                        key={i}
                        x1={l.x1}
                        y1={l.y1}
                        x2={l.x2}
                        y2={l.y2}
                        stroke="var(--primary)"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="flex flex-col gap-2.5">
                    {pairs.map((p, i) => {
                      const isMatched = matched.includes(i);
                      const isSel = selTerm === i;
                      return (
                        <div
                          key={i}
                          ref={(el) => {
                            termRefs.current[i] = el;
                          }}
                          className={cn(
                            box,
                            "font-medium",
                            isMatched
                              ? "border-emerald-500/50 bg-emerald-500/10 hs-demo-ok"
                              : isSel
                                ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                                : "border-border bg-card/60 text-foreground"
                          )}
                        >
                          {p.term}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {DEF_ORDER.map((pairIdx, pos) => {
                      const isMatched = matched.includes(pairIdx);
                      return (
                        <div
                          key={pos}
                          ref={(el) => {
                            defRefs.current[pos] = el;
                          }}
                          className={cn(
                            box,
                            isMatched
                              ? "border-emerald-500/50 bg-emerald-500/10 hs-demo-ok"
                              : "border-border bg-card/60 text-muted-foreground"
                          )}
                        >
                          {pairs[pairIdx].def}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-3.5 text-center text-xs font-medium text-muted-foreground">
                  {matched.length === pairs.length
                    ? t("landing.how.kilat.c4_done")
                    : `${matched.length}/${pairs.length}`}
                </p>
              </div>
            )}

            {step === STEP.bs && (
              <div>
                <div className="mb-3">
                  <Tag>{t("landing.how.kilat.c5_tag")}</Tag>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{t("landing.how.kilat.c5_prompt")}</p>
                {tfIdx < tf.length ? (
                  <>
                    <div className="flex min-h-[128px] items-center justify-center rounded-2xl border border-border bg-card/60 px-6 py-6 text-center">
                      <p className="text-[15px] font-semibold leading-snug text-foreground">
                        {tf[tfIdx].text}
                      </p>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <div
                        ref={tfFalseRef}
                        className={cn(
                          "flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
                          tfFlash === "false"
                            ? "border-rose-500/60 bg-rose-500/20 hs-demo-bad"
                            : "border-rose-500/40 bg-rose-500/10 hs-demo-bad"
                        )}
                      >
                        {t("landing.how.kilat.c5_false")}
                      </div>
                      <div
                        ref={tfTrueRef}
                        className={cn(
                          "flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
                          tfFlash === "true"
                            ? "border-emerald-500/60 bg-emerald-500/20 hs-demo-ok"
                            : "border-emerald-500/40 bg-emerald-500/10 hs-demo-ok"
                        )}
                      >
                        {t("landing.how.kilat.c5_true")}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    {tf.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm hs-demo-ok"
                      >
                        <CheckGlyph className="shrink-0" />
                        <span className="text-foreground/90">{s.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === STEP.nilai && (
              <div className="flex flex-col items-center text-center">
                <span className="mb-3 inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold hs-demo-ok">
                  {t("landing.how.kilat.c6_pass")}
                </span>
                <p className="font-display text-5xl font-extrabold tabular-nums text-emerald-500">90%</p>
                <h3 className="mt-2 font-display text-xl font-bold text-foreground">
                  {t("landing.how.kilat.c6_title")}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {t("landing.how.kilat.c6_msg")}
                </p>
                <div className="mt-4 grid w-full max-w-[240px] grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border bg-card/60 px-3 py-2.5">
                    <p className="font-display text-lg font-bold tabular-nums text-foreground">90%</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("landing.how.kilat.c6_stat_score")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 px-3 py-2.5">
                    <p className="font-display text-lg font-bold tabular-nums text-foreground">6/6</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("landing.how.kilat.c6_stat_correct")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* swipe-up hint */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-2 flex justify-center transition-opacity duration-300",
            hint ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
            {t("landing.how.kilat.hint")}
            <span className="hs-kilat-rise inline-flex text-primary">
              <ArrowUpGlyph />
            </span>
          </span>
        </div>
      </div>

      {!reduce && (
        <DemoCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} hidden={cursor.hidden} />
      )}
      <span className="sr-only">{t("landing.how.kilat.sr")}</span>
    </div>
  );
}
