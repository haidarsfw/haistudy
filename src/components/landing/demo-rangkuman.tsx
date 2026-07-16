"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Headphones,
  Maximize2,
  Bookmark,
  Moon,
  Sun,
  BookOpen,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { DemoCursor } from "@/components/landing/demo-cursor";
import { useLandingTheme } from "@/components/landing/landing-shell";

type Mode = "ringkas" | "normal" | "mendalam";
type Reading = "dark" | "light" | "paper";

const KEY_SENTENCE = "Privasi itu hak pribadi tiap orang";
const KEY_WORDS = KEY_SENTENCE.split(" ");

// Global pace for the self-playing loops (< 1 = faster). Applied to every sleep
// so the rangkuman + AI loops stay in their relative rhythm, just quicker.
const SPEED = 0.62;
// The AI window reads slower than the rest (multiplied on top of SPEED,
// uniformly, so its own steps stay in sync). > 1 = slower.
const AI_SLOW = 1.7;

const STABILO = [
  { name: "kuning", dot: "rgba(250,204,21,0.9)", fill: "rgba(250,204,21,0.42)" },
  { name: "hijau", dot: "rgba(16,185,129,0.9)", fill: "rgba(16,185,129,0.40)" },
  { name: "biru", dot: "rgba(59,130,246,0.9)", fill: "rgba(59,130,246,0.38)" },
];

const READING: Record<Reading, { bg: string; fg: string }> = {
  dark: { bg: "#12201b", fg: "#eef3f0" },
  light: { bg: "#ffffff", fg: "#18211d" },
  paper: { bg: "#f4ecd8", fg: "#5b4636" },
};

/** Custom summary glyph (no lucide, no background box). */
function SummaryGlyph() {
  const id = useId();
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke={`url(#${id})`} strokeWidth="1.7" />
      <path d="M7.5 9h9M7.5 12.4h9M7.5 15.8h5.5" stroke={`url(#${id})`} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Custom AI sparkle — a sharp 8-point twinkle (4 long + 4 short), thin centre,
 * brand gradient. Not a lucide icon, not the brand logo. */
function AIGlyph({ size = 18 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <path
        d="M23 12L13.85 12.77L15.89 15.89L12.77 13.85L12 23L11.23 13.85L8.11 15.89L10.15 12.77L1 12L10.15 11.23L8.11 8.11L11.23 10.15L12 1L12.77 10.15L15.89 8.11L13.85 11.23Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

/** Return / Enter glyph for the AI input. */
function EnterIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7v3a3 3 0 0 1-3 3H5" />
      <path d="M9 9l-4 4 4 4" />
    </svg>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-0.5">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60 [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60 [animation-delay:240ms]" />
    </span>
  );
}

/**
 * "Rangkuman → haistudy AI" demo. Two self-playing widgets. The Rangkuman
 * cursor cycles depth modes, opens the table, plays TTS, then selects a sentence
 * and stabilo-highlights it. The AI window (its own loop) types a question into
 * its box, hits enter, gets an answer with an example, then a short thank-you
 * follow-up. The reading pane follows the site theme (and the reading toggle can
 * override dark / light / paper). Fixed sizes; reduced-motion = settled state.
 */
export function DemoRangkumanAI() {
  const { t, locale } = useTranslation();
  const { resolved } = useLandingTheme();

  const containerRef = useRef<HTMLDivElement>(null);
  const ringkasRef = useRef<HTMLButtonElement>(null);
  const normalRef = useRef<HTMLButtonElement>(null);
  const mendalamRef = useRef<HTMLButtonElement>(null);
  const tableRef = useRef<HTMLButtonElement>(null);
  const ttsRef = useRef<HTMLButtonElement>(null);
  const sentRef = useRef<HTMLSpanElement>(null);
  const stabiloRef = useRef<HTMLButtonElement>(null);
  const tanyaRef = useRef<HTMLButtonElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("normal");
  const [reading, setReading] = useState<Reading>("dark");
  const [tableOpen, setTableOpen] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [selCount, setSelCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, clicking: false, hidden: true });

  const [aiStarted, setAiStarted] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [aiMsgs, setAiMsgs] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  // Mobile drops the collapsible table so the reading pane isn't so crammed.
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Only self-play while on screen — scrolled away, the loop below tears down.
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

  // Reading pane follows the site theme; changing the site theme re-syncs it.
  useEffect(() => {
    setReading(resolved === "light" ? "light" : "dark");
  }, [resolved]);

  // Keep the AI chat scrolled to the latest message.
  useEffect(() => {
    const el = aiScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [aiMsgs, aiThinking, aiInput]);

  useEffect(() => {
    const question = t("landing.how.ai.question");
    const answer = t("landing.how.ai.answer");
    const q2 = "Makasih, ngebantu banget!";
    const a2 = "Sama-sama! Senang bisa bantu belajarmu.";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setMode("normal");
      setTableOpen(true);
      setApplied(STABILO[0].fill);
      setAiStarted(true);
      setAiMsgs([
        { role: "user", text: question },
        { role: "ai", text: answer },
      ]);
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

    const rect = (el: HTMLElement | null) => {
      const c = containerRef.current;
      if (!el || !c) return null;
      const cr = c.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { left: r.left - cr.left, top: r.top - cr.top, w: r.width, h: r.height };
    };
    const center = (el: HTMLElement | null) => {
      const r = rect(el);
      return r ? { x: r.left + r.w / 2, y: r.top + r.h / 2 } : { x: 0, y: 0 };
    };
    const moveTo = (p: { x: number; y: number }) =>
      setCursor((c) => ({ ...c, x: p.x, y: p.y, hidden: false }));
    const clickAt = async (ref: React.RefObject<HTMLButtonElement | null>) => {
      moveTo(center(ref.current));
      await sleep(560);
      if (cancelled) return;
      setCursor((c) => ({ ...c, clicking: true }));
      await sleep(170);
      setCursor((c) => ({ ...c, clicking: false }));
      await sleep(60);
    };

    // ── Rangkuman loop ──
    async function rangkumanLoop() {
      while (!cancelled) {
        setMode("normal");
        setTableOpen(false);
        setTtsOn(false);
        setSelCount(0);
        setPopoverOpen(false);
        setApplied(null);
        // The AI window keeps its last answer between loops (no blank flash) —
        // it only clears + re-sends the instant the cursor clicks "Tanya AI".
        setCursor((c) => ({ ...c, hidden: true }));
        await sleep(500);
        if (cancelled) return;

        await clickAt(mendalamRef);
        if (cancelled) return;
        setMode("mendalam");
        await sleep(1400);
        if (cancelled) return;
        await clickAt(ringkasRef);
        if (cancelled) return;
        setMode("ringkas");
        await sleep(1300);
        if (cancelled) return;
        await clickAt(normalRef);
        if (cancelled) return;
        setMode("normal");
        await sleep(800);
        if (cancelled) return;

        if (!isMobile) {
          await clickAt(tableRef);
          if (cancelled) return;
          setTableOpen(true);
          await sleep(1300);
          if (cancelled) return;
        }

        await clickAt(ttsRef);
        if (cancelled) return;
        setTtsOn(true);
        await sleep(1400);
        if (cancelled) return;

        const r = rect(sentRef.current);
        if (r) {
          const sx = r.left + 8;
          const ex = r.left + r.w - 8;
          const y = r.top + r.h / 2;
          moveTo({ x: sx, y });
          await sleep(480);
          if (cancelled) return;
          for (let i = 1; i <= KEY_WORDS.length; i++) {
            if (cancelled) return;
            setSelCount(i);
            moveTo({ x: sx + ((ex - sx) * i) / KEY_WORDS.length, y });
            await sleep(80);
          }
        }
        await sleep(200);
        if (cancelled) return;
        setPopoverOpen(true);
        await sleep(850);
        if (cancelled) return;
        await clickAt(stabiloRef);
        if (cancelled) return;
        setApplied(STABILO[0].fill);
        await sleep(650);
        if (cancelled) return;
        await clickAt(tanyaRef);
        if (cancelled) return;
        setPopoverOpen(false);
        setCursor((c) => ({ ...c, hidden: true }));
        // Fire-and-forget: the rangkuman loop never waits for the AI — both run
        // nonstop and endlessly. The question is *sent* the instant this click
        // lands (synced), then the AI plays its own Q → A → "makasih" exchange
        // while the rangkuman keeps cycling. A run token bails any overlap.
        void playAI();
        await sleep(400);
      }
    }

    // ── AI window: fires on the rangkuman click and plays its own endless
    //    Q → A → "makasih" → "sama-sama" exchange. A run token makes a fresh
    //    click supersede any still-playing run, so neither widget ever waits. ──
    const aiSleep = (ms: number) => sleep(ms * AI_SLOW);
    let aiRun = 0;
    const typeInput = async (text: string, alive: () => boolean) => {
      const w = text.split(" ");
      for (let i = 1; i <= w.length; i++) {
        if (!alive()) return;
        setAiInput(w.slice(0, i).join(" "));
        await aiSleep(55);
      }
    };
    const typeAi = async (text: string, alive: () => boolean) => {
      setAiMsgs((m) => [...m, { role: "ai", text: "" }]);
      const w = text.split(" ");
      for (let i = 1; i <= w.length; i++) {
        if (!alive()) return;
        setAiMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "ai", text: w.slice(0, i).join(" ") };
          return c;
        });
        await aiSleep(40);
      }
    };
    async function playAI() {
      const my = ++aiRun;
      const alive = () => !cancelled && my === aiRun;
      setAiStarted(true);
      setAiInput("");
      setAiThinking(false);
      // Q1 — sent at the click instant (synced to the "Tanya AI" click).
      setAiMsgs([{ role: "user", text: question }]);
      await aiSleep(450);
      if (!alive()) return;
      setAiThinking(true);
      await aiSleep(850);
      if (!alive()) return;
      setAiThinking(false);
      await typeAi(answer, alive);
      if (!alive()) return;
      await aiSleep(1500);
      if (!alive()) return;
      // Q2 — a short thank-you, typed then sent.
      await typeInput(q2, alive);
      if (!alive()) return;
      setAiInput("");
      setAiMsgs((m) => [...m, { role: "user", text: q2 }]);
      await aiSleep(450);
      if (!alive()) return;
      setAiThinking(true);
      await aiSleep(650);
      if (!alive()) return;
      setAiThinking(false);
      await typeAi(a2, alive);
    }

    rangkumanLoop();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, isMobile, active]);

  const rc = READING[reading];
  const cycleReading = () =>
    setReading((r) => (r === "dark" ? "light" : r === "light" ? "paper" : "dark"));

  const modeBtn = (m: Mode) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
      mode === m ? "bg-foreground/10 text-foreground" : "text-muted-foreground"
    }`;
  const toolIcon =
    "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors";

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-5">
      {/* ── Rangkuman window ── */}
      <div className="flex min-w-0 flex-col lg:col-span-3">
      <div
        ref={containerRef}
        className="relative flex h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:h-[460px]"
      >
        <div className="flex items-center gap-2.5 border-b border-border/70 px-5 py-3">
          <SummaryGlyph />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold leading-tight text-foreground">
              {t("landing.how.rangkuman.tag")}
            </p>
            <p className="text-xs text-muted-foreground">{t("landing.how.rangkuman.subject")}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={cycleReading}
              aria-label="Ganti tema baca (gelap, terang, kertas)"
              className={`${toolIcon} hover:text-foreground`}
            >
              {reading === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : reading === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
            </button>
            <button
              ref={ttsRef}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={`${toolIcon} ${ttsOn ? "text-primary" : ""}`}
            >
              <Headphones className="h-4 w-4" />
            </button>
            <span className={toolIcon}>
              <Maximize2 className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* module title + depth modes */}
        <div className="flex items-center justify-between gap-3 px-5 pt-3">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
            Modul 1: Technology and Privacy in the Workplace
          </p>
          <div className="inline-flex shrink-0 rounded-full border border-border p-0.5">
            <button ref={ringkasRef} type="button" tabIndex={-1} aria-hidden="true" className={modeBtn("ringkas")}>
              {t("landing.how.rangkuman.mode_ringkas")}
            </button>
            <button ref={normalRef} type="button" tabIndex={-1} aria-hidden="true" className={modeBtn("normal")}>
              {t("landing.how.rangkuman.mode_normal")}
            </button>
            <button ref={mendalamRef} type="button" tabIndex={-1} aria-hidden="true" className={modeBtn("mendalam")}>
              {t("landing.how.rangkuman.mode_mendalam")}
            </button>
          </div>
        </div>

        {/* reading pane (follows theme, scrolls so nothing is cut) */}
        <div
          className="mx-3 mb-3 mt-3 flex-1 overflow-y-auto rounded-xl px-4 py-3 text-sm leading-relaxed transition-colors [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ background: rc.bg, color: rc.fg }}
        >
          <div key={mode} style={{ animation: "fade-in-css 0.3s ease" }} className="mt-1">
            {mode === "ringkas" && (
              <ul className="space-y-2">
                {[
                  "Perusahaan boleh memantau kerja biar aman dan sesuai aturan.",
                  "Tapi karyawan tetap punya privasi yang harus dihormatin.",
                  "Privasi itu hak pribadi tiap orang, nggak bisa diambil begitu aja.",
                  "Solusinya: aturan yang jelas dan adil buat dua-duanya.",
                ].map((li) => (
                  <li key={li} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                    <span>{li}</span>
                  </li>
                ))}
              </ul>
            )}

            {mode === "normal" && (
              <div className="space-y-2.5">
                <p className="text-[13px] italic opacity-70">
                  Bahas soal privasi karyawan di tempat kerja dan sampai mana perusahaan boleh
                  memantau.
                </p>
                <p>
                  Di kantor, perusahaan sering pengin memantau kerja karyawan biar aman dan sesuai
                  aturan, tapi karyawan juga tetap punya sisi pribadi yang harus dihormatin.{" "}
                  <span ref={sentRef} className="relative inline">
                    {applied ? (
                      <span
                        className="rounded-[2px] px-0.5 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
                        style={{ background: applied }}
                      >
                        {KEY_SENTENCE}
                      </span>
                    ) : (
                      KEY_WORDS.map((w, i) => (
                        <span
                          key={i}
                          className={
                            i < selCount
                              ? "rounded-[2px] bg-primary/40 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
                              : ""
                          }
                        >
                          {w}
                          {i < KEY_WORDS.length - 1 ? " " : ""}
                        </span>
                      ))
                    )}
                    {popoverOpen && (
                      <span
                        className="absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-card"
                        style={{ animation: "fade-in-css 0.2s ease" }}
                      >
                        <span className="flex items-center gap-2">
                          {STABILO.map((s, i) => (
                            <button
                              key={s.name}
                              ref={i === 0 ? stabiloRef : undefined}
                              type="button"
                              tabIndex={-1}
                              aria-hidden="true"
                              className="h-4 w-4 rounded-full ring-1 ring-black/10"
                              style={{ background: s.dot }}
                            />
                          ))}
                        </span>
                        <span className="h-4 w-px bg-border" />
                        <Bookmark className="h-4 w-4 text-muted-foreground" />
                        <span className="h-4 w-px bg-border" />
                        <button
                          ref={tanyaRef}
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary"
                        >
                          <AIGlyph size={16} />
                          {t("landing.how.rangkuman.ask")}
                        </button>
                      </span>
                    )}
                  </span>{" "}
                  jadi nggak bisa diambil begitu aja.
                </p>
                <p className="opacity-90">Makanya perlu aturan yang jelas dan adil buat dua-duanya.</p>
              </div>
            )}

            {mode === "mendalam" && (
              <div className="space-y-2.5">
                <p className="text-[13px] italic opacity-70">
                  Bahas soal privasi karyawan di tempat kerja dan sampai mana perusahaan boleh
                  memantau.
                </p>
                <p>
                  Privasi di tempat kerja itu soal keseimbangan: perusahaan pengin memantau biar
                  aman, karyawan tetap punya ruang pribadi. Dua-duanya sama penting, jadi harus
                  diatur baik-baik.
                </p>
                <p>
                  Di kantor, perusahaan sering pengin memantau kerja karyawan biar aman dan sesuai
                  aturan. Tapi karyawan juga punya sisi pribadi yang nggak semuanya boleh diintip,
                  dan di sinilah muncul tarik-menarik antara kepentingan perusahaan dan hak karyawan.
                </p>
                <p>
                  Contohnya, email kantor bisa diminta jadi bukti kalau ada kasus hukum. Artinya,
                  apa yang kamu tulis di email kerja belum tentu benar-benar pribadi.
                </p>
                <p className="text-[13px] opacity-70">
                  Intinya: memantau boleh, asal transparan, jelas batasannya, dan tetap hormatin
                  privasi karyawan.
                </p>
              </div>
            )}
          </div>

          {/* collapsible table (desktop only — keeps the mobile pane lighter) */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-current/15 sm:block">
            <button
              ref={tableRef}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-300 ${
                  tableOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              Tabel 7.1 Legal Status of Employee Monitoring
            </button>
            {tableOpen && (
              <div className="border-t border-current/15 p-2.5" style={{ animation: "fade-in-css 0.28s ease" }}>
                <div className="overflow-hidden rounded-md border border-current/15 text-[12px]">
                  <div className="grid grid-cols-[1fr_1.4fr] bg-current/[0.06] font-semibold">
                    <div className="border-r border-current/15 px-2.5 py-1.5">Metode</div>
                    <div className="px-2.5 py-1.5">Status</div>
                  </div>
                  <div className="grid grid-cols-[1fr_1.4fr] border-t border-current/15 opacity-80">
                    <div className="border-r border-current/15 px-2.5 py-1.5">Voice-mail</div>
                    <div className="px-2.5 py-1.5">Perlakuannya mirip email.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* thin TTS bar with a sound equalizer */}
        {ttsOn && (
          <div
            className="mx-3 mb-3 flex items-center gap-2.5 rounded-lg border border-border bg-background/60 px-3 py-1.5"
            style={{ animation: "fade-in-css 0.3s ease" }}
          >
            <SkipBack className="h-3 w-3 text-muted-foreground" />
            <Pause className="h-4 w-4 text-primary" />
            <SkipForward className="h-3 w-3 text-muted-foreground" />
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full w-2/5 rounded-full bg-primary/70" />
            </div>
            <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-[2px] origin-bottom rounded-full bg-primary"
                  style={{ height: "100%", animation: `hs-eq 0.7s ease-in-out ${i * 0.13}s infinite` }}
                />
              ))}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">Suara AI · 1.5x</span>
          </div>
        )}

        <DemoCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} hidden={cursor.hidden} />
      </div>
        <p className="mt-2.5 text-center text-xs italic leading-relaxed text-muted-foreground">
          {t("landing.how.rangkuman.caption")}
        </p>
      </div>

      {/* ── haistudy AI window ── */}
      <div className="flex min-w-0 flex-col lg:col-span-2">
      <div className="flex h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:h-[460px]">
        <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
          <AIGlyph size={26} />
          <p className="font-display text-sm font-semibold leading-tight text-foreground">
            haistudy AI
          </p>
        </div>

        <div
          ref={aiScrollRef}
          className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {!aiStarted ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <AIGlyph size={44} />
              <p className="max-w-[16rem] text-xs text-muted-foreground">
                Sorot teks di rangkuman, terus klik Tanya haistudy AI di sebelah.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-accent/40 px-3 py-2">
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <AIGlyph size={13} />
                  {t("landing.how.ai.quoted")}
                </p>
                <p className="mt-0.5 text-[13px] italic text-foreground/80">“{KEY_SENTENCE}”</p>
              </div>

              {aiMsgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end" style={{ animation: "fade-in-css 0.25s ease" }}>
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-3 py-2 text-[13px] text-foreground">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start gap-2" style={{ animation: "fade-in-css 0.25s ease" }}>
                    <span className="mt-0.5 shrink-0">
                      <AIGlyph size={18} />
                    </span>
                    <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-border bg-background px-3 py-2 text-[13px] text-foreground">
                      {m.text}
                    </div>
                  </div>
                )
              )}

              {aiThinking && (
                <div className="flex justify-start gap-2">
                  <span className="mt-0.5 shrink-0">
                    <AIGlyph size={16} />
                  </span>
                  <div className="rounded-2xl rounded-bl-md border border-border bg-background px-3 py-2 text-[13px] text-foreground">
                    <TypingDots />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border/70 p-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-xs">
            <span
              className={`flex-1 truncate ${aiInput ? "text-foreground" : "text-muted-foreground"}`}
            >
              {aiInput || t("landing.how.ai.placeholder")}
              {aiInput && (
                <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-foreground align-middle" />
              )}
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <EnterIcon size={14} />
            </span>
          </div>
        </div>
      </div>
        <p className="mt-2.5 text-center text-xs italic leading-relaxed text-muted-foreground">
          {t("landing.how.ai.caption")}
        </p>
      </div>

      <span className="sr-only">{t("landing.how.rangkuman.sr")}</span>
    </div>
  );
}
