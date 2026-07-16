"use client";

import { useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import { EOQ_HTML } from "@/components/landing/eoq-html";
import {
  Home,
  BookOpen,
  Calendar,
  BarChart3,
  StickyNote,
  Library,
  Search,
  Mic,
  MessageCircle,
  Sparkles,
  Bell,
  Moon,
  Clock,
  TrendingUp,
  Users,
  Play,
  ArrowRight,
  ArrowDown,
  Flame,
  Trophy,
  CalendarCheck,
  Bookmark,
  Cloud,
  Scale,
  Settings2,
  Calculator,
  Bot,
  MoreHorizontal,
  Lightbulb,
  FileText,
  Zap,
  PenLine,
  Layers,
  Send,
  Timer,
  Music,
} from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { BrowserWindow } from "@/components/landing/browser-window";
import { LogoMark } from "@/components/landing/logo";
import { DemoCursor } from "@/components/landing/demo-cursor";

/**
 * Hero product tour. A single self-playing, cursor-driven walkthrough of the
 * real haistudy app — rebuilt faithfully in the landing theme (not a screenshot).
 * The fake cursor drives the real chrome: sidebar nav, header Mic (voice), the
 * two bottom-right FABs (AI = Bot, Chat). It opens the community trio (voice /
 * chat / AI) from the dashboard, then opens a subject (its tabs are skeletons —
 * the full feature demos live further down the page) and glances Jadwal /
 * Statistik / Catatan / Library. Desktop + a true mobile mirror. Reduced-motion
 * → a settled dashboard, no motion.
 */

const SPEED = 0.72;
const AI_SLOW = 1.35;

type Surface = "dashboard" | "subjects" | "subject" | "jadwal" | "statistik" | "catatan" | "library";
type Panel = null | "voice" | "chat" | "ai";
type Msg = { role: "me" | "them" | "ai"; name?: string; text: string };

const SUBJECTS = [
  { id: "bizethics", name: "Business Ethics", icon: Scale, tone: "text-teal-500", desc: "Prinsip etika dalam praktik bisnis", pct: 85 },
  { id: "opsmgmt", name: "Operations Management", icon: Settings2, tone: "text-orange-500", desc: "Manajemen operasional & proses", pct: 72 },
  { id: "akuntansi", name: "Accounting for Business", icon: Calculator, tone: "text-violet-500", desc: "Dasar akuntansi untuk bisnis", pct: 64 },
  { id: "foundai", name: "Foundations of AI", icon: Bot, tone: "text-rose-500", desc: "Pengantar kecerdasan buatan", pct: 90 },
] as const;

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "subjects", label: "Mata Kuliah", icon: BookOpen },
  { key: "jadwal", label: "Jadwal", icon: Calendar },
  { key: "statistik", label: "Statistik", icon: BarChart3 },
  { key: "catatan", label: "Catatan", icon: StickyNote },
  { key: "library", label: "Library", icon: Library },
] as const;

const SUBJECT_TABS = [
  { key: "materi", label: "Materi", icon: FileText },
  { key: "rangkuman", label: "Rangkuman", icon: BookOpen },
  { key: "kilat", label: "Belajar Kilat", icon: Zap },
  { key: "latihan", label: "Latihan Soal", icon: PenLine },
  { key: "drill", label: "Drill", icon: Layers },
] as const;

const DOT_TONES = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];

/* ── tiny presentational helpers ───────────────────────────────────────── */

function Ring({ percent, size = 50, stroke = 3.5 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          strokeDashoffset={c - (percent / 100) * c}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

function StatCard({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col rounded-xl border border-border bg-card p-3">{children}</div>;
}

function CardLabel({ icon: Icon, tone, children }: { icon: typeof Clock; tone?: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${tone ?? "text-muted-foreground"}`} />
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</span>
    </div>
  );
}

function Avatars({ names, tones }: { names: string[]; tones: string[] }) {
  return (
    <div className="flex -space-x-1">
      {names.map((n, i) => (
        <span
          key={i}
          className={`flex h-5 w-5 items-center justify-center rounded-full border border-card text-[8px] font-bold text-white ${tones[i % tones.length]}`}
        >
          {n.charAt(0)}
        </span>
      ))}
    </div>
  );
}

/* ── surfaces ──────────────────────────────────────────────────────────── */

function DashboardSurface({ mobile }: { mobile?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${mobile ? "p-3" : "p-4"}`}>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground">Senin, 22 Juni 2026</p>
            <div className="font-display mt-0.5 text-base font-extrabold sm:text-lg">
              Selamat pagi, Haidar!
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Lebih dari setengah jalan, keren!</p>
          </div>
          <Ring percent={78} size={mobile ? 44 : 50} stroke={2.5} />
        </div>
        <div className="my-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[9px] text-muted-foreground/80">Semester 2 · UAS · Business Management</span>
        </div>
        <div className={`grid gap-3 ${mobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <div className="flex items-start gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Tips Belajar</p>
              <p className="text-[11px] leading-snug">Ulang flashcard tiap pagi biar nempel lebih lama.</p>
            </div>
          </div>
          {!mobile && (
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Tahukah Kamu</p>
                <p className="text-[11px] leading-snug">Otak lebih inget materi kalau diselingi istirahat pendek.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`grid gap-3 ${mobile ? "grid-cols-2" : "grid-cols-4"}`}>
        <StatCard>
          <CardLabel icon={Clock}>Hitung Mundur</CardLabel>
          <p className="truncate text-[11px] font-semibold">Found. AI</p>
          <p className="mt-0.5 text-[11px] font-bold tabular-nums text-foreground">2 hari 5 jam</p>
        </StatCard>
        <StatCard>
          <CardLabel icon={TrendingUp} tone="text-primary">Progres</CardLabel>
          <div className="flex flex-1 items-center justify-center">
            <Ring percent={78} size={34} stroke={2} />
          </div>
        </StatCard>
        <StatCard>
          <CardLabel icon={StickyNote} tone="text-amber-500">Catatan Cepat</CardLabel>
          <p className="text-[9px] leading-snug text-muted-foreground">Review bab 5 sebelum ujian Rabu.</p>
        </StatCard>
        <StatCard>
          <div className="flex items-center justify-between">
            <CardLabel icon={Users}>Online</CardLabel>
            <span className="text-[13px] font-bold tabular-nums">12</span>
          </div>
          <div className="mt-1">
            <Avatars names={["R", "N", "A", "F", "D"]} tones={DOT_TONES} />
          </div>
        </StatCard>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Play className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold">Lanjut Belajar</p>
        </div>
        <div className="space-y-1.5">
          {SUBJECTS.slice(0, mobile ? 2 : 3).map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
              <s.icon className={`h-4 w-4 shrink-0 ${s.tone}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{s.name}</p>
                <p className="truncate text-[9px] text-muted-foreground">{s.desc}</p>
              </div>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubjectsSurface({
  cardRef,
  mobile,
}: {
  cardRef: React.RefObject<HTMLButtonElement | null>;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "p-3" : "p-4"}>
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <div className="font-display text-sm font-bold">Mata Kuliah</div>
      </div>
      <div className={`grid gap-3 ${mobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {SUBJECTS.map((s) => {
          const isTarget = s.id === "foundai";
          return (
            <button
              key={s.id}
              ref={isTarget ? cardRef : undefined}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={`flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors ${
                isTarget ? "border-primary/30" : "border-border"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{s.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{s.desc}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">{s.pct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The subject's tabs are skeletons only — each of these features has its own
// full live demo further down the page. A single sliding underline glides
// between tabs (measured), and the body floats gently with a scroll hint.
function SubjectDetailSurface({
  activeTab,
  tabRefs,
  mobile,
}: {
  activeTab: string;
  tabRefs: Record<string, React.RefObject<HTMLButtonElement | null>>;
  mobile?: boolean;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [ul, setUl] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const strip = stripRef.current;
    const btn = tabRefs[activeTab]?.current;
    if (!strip || !btn) return;
    const sr = strip.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setUl({ left: br.left - sr.left, width: br.width, ready: true });
  }, [activeTab, mobile, tabRefs]);

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 border-b border-border ${mobile ? "px-3 py-2.5" : "px-4 py-3"}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-rose-500">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Foundations of AI</p>
          <p className="text-[10px] text-muted-foreground">Pengantar kecerdasan buatan</p>
        </div>
      </div>
      <div ref={stripRef} className="relative flex gap-0.5 overflow-hidden border-b border-border px-2">
        {SUBJECT_TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              ref={tabRefs[tab.key]}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className={mobile ? "hidden" : ""}>{tab.label}</span>
            </button>
          );
        })}
        {/* single sliding indicator */}
        {ul.ready && (
          <span
            className="absolute bottom-0 h-0.5 rounded-full bg-primary transition-all duration-[600ms] ease-[cubic-bezier(0.33,1,0.68,1)]"
            style={{ left: ul.left, width: ul.width }}
          />
        )}
      </div>
      {/* skeleton body (floats) + scroll hint */}
      <div className={`flex flex-1 flex-col items-center justify-center gap-4 ${mobile ? "p-3" : "p-5"}`}>
        <div className="w-full max-w-[300px] space-y-2.5">
          <div className="h-2.5 w-1/2 rounded bg-foreground/10" />
          <div className="h-2 w-full rounded bg-foreground/[0.08]" />
          <div className="h-2 w-5/6 rounded bg-foreground/[0.08]" />
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="h-12 rounded-lg bg-foreground/[0.07]" />
            <div className="h-12 rounded-lg bg-foreground/[0.07]" />
          </div>
        </div>
        <div className="hs-float flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary">
          <ArrowDown className="h-3.5 w-3.5" />
          Scroll ke bawah buat lihat fitur ini lebih detail
        </div>
      </div>
    </div>
  );
}

function JadwalSurface({ mobile }: { mobile?: boolean }) {
  const rows = [
    { subj: "Business Ethics", day: "Selasa 23 Jun", type: "Onsite" },
    { subj: "Foundations of AI", day: "Rabu 24 Jun", type: "Onsite" },
    { subj: "Accounting", day: "Senin 29 Jun", type: "Onsite" },
    { subj: "Operations Mgmt", day: "Kamis 2 Jul", type: "Onsite" },
  ];
  return (
    <div className={mobile ? "p-3" : "p-4"}>
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <div className="font-display text-sm font-bold">Jadwal Ujian</div>
      </div>
      <div className="mb-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ujian Berikutnya</p>
        <p className="mt-0.5 text-sm font-bold">Foundations of AI</p>
        <p className="mt-1 text-xl font-extrabold tabular-nums text-primary">2 hari 5 jam 12 menit</p>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.subj} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">{r.subj}</p>
              <p className="text-[9px] text-muted-foreground">{r.day}</p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
              {r.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatistikSurface({ mobile }: { mobile?: boolean }) {
  const summary = [
    { icon: TrendingUp, tone: "text-primary", val: "78%", label: "Total Progres" },
    { icon: Flame, tone: "text-orange-500", val: "5", label: "Hari Beruntun" },
    { icon: Trophy, tone: "text-amber-500", val: "12", label: "Rekor" },
    { icon: CalendarCheck, tone: "text-sky-500", val: "9", label: "Hari Aktif" },
  ];
  const bars = [
    { name: "Business Ethics", pct: 85 },
    { name: "Operations Management", pct: 72 },
    { name: "Accounting for Business", pct: 64 },
    { name: "Foundations of AI", pct: 90 },
  ];
  return (
    <div className={mobile ? "p-3" : "p-4"}>
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <div className="font-display text-sm font-bold">Statistik Belajar</div>
      </div>
      <div className={`mb-3 grid gap-2.5 ${mobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <s.icon className={`h-4 w-4 ${s.tone}`} />
              <span className="text-lg font-bold tabular-nums">{s.val}</span>
            </div>
            <p className="mt-0.5 text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-semibold">Progres per Mata Kuliah</p>
        </div>
        <div className="space-y-2.5">
          {bars.map((b) => (
            <div key={b.name} className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="truncate font-medium">{b.name}</span>
                <span className="text-muted-foreground">{b.pct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/80" style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {!mobile && (
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { val: "14", label: "Total Latihan" },
            { val: "92%", label: "Skor Terbaik" },
            { val: "78%", label: "Rata-rata" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-base font-bold tabular-nums text-foreground">{s.val}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CatatanSurface({ mobile }: { mobile?: boolean }) {
  const notes = [
    { title: "Rumus EOQ — Ops Mgmt", dot: "bg-orange-500", formula: true, body: " simpan safety stock buat lead time." },
    { title: "Rumus Akuntansi penting", dot: "bg-violet-500", formula: false, body: "Aset = Liabilitas + Ekuitas. Jurnal penyesuaian akhir." },
    { title: "Etika bisnis — poin ujian", dot: "bg-teal-500", formula: false, body: "Utilitarianism vs deontology. Contoh kasus CSR." },
  ];
  return (
    <div className={mobile ? "p-3" : "p-4"}>
      <div className="mb-3 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-amber-500" />
        <div className="font-display text-sm font-bold">Catatan</div>
      </div>
      <div className="space-y-2">
        {notes.slice(0, mobile ? 2 : 3).map((n) => (
          <div key={n.title} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${n.dot}`} />
              <p className="truncate text-[11px] font-semibold">{n.title}</p>
              <Cloud className="ml-auto h-3 w-3 shrink-0 text-emerald-500" />
            </div>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
              {n.formula && (
                <span
                  className="mr-1 align-middle text-[10px] text-foreground"
                  dangerouslySetInnerHTML={{ __html: EOQ_HTML }}
                />
              )}
              {n.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LibrarySurface({ mobile }: { mobile?: boolean }) {
  const items = [
    { title: "Konsep Utility & Demand", type: "Materi", icon: FileText },
    { title: "Flashcard Etika Bisnis", type: "Flashcard", icon: Layers },
    { title: "Kisi-kisi UAS Akuntansi", type: "Kisi-Kisi", icon: FileText },
  ];
  return (
    <div className={mobile ? "p-3" : "p-4"}>
      <div className="mb-3 flex items-center gap-2">
        <Library className="h-4 w-4 text-primary" />
        <div className="font-display text-sm font-bold">Library</div>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[11px] font-semibold">Bookmark tersimpan</p>
        <span className="text-[9px] text-muted-foreground">{items.length} item</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, mobile ? 2 : 3).map((it) => (
          <div key={it.title} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
            <it.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-[11px]">{it.title}</span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
              {it.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── slide-over panels (community trio) — slide from the right, like the app ── */

function PanelShell({ title, icon: Icon, children, mobile, exiting }: { title: string; icon: typeof Mic; children: React.ReactNode; mobile?: boolean; exiting?: boolean }) {
  return (
    <div
      className={`absolute inset-y-0 right-0 z-20 flex flex-col border-l border-border bg-background shadow-2xl ${
        mobile ? "w-full" : "w-[64%] max-w-[340px]"
      }`}
      style={{
        // open + close mirror each other: same duration, symmetric easing
        // (easeOutCubic in / easeInCubic out) so both read at the same speed.
        animation: exiting
          ? "hs-panel-out 0.28s cubic-bezier(0.32,0,0.67,0) forwards"
          : "hs-panel-in 0.28s cubic-bezier(0.33,1,0.68,1)",
      }}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}

function VoicePanel({ mobile, exiting }: { mobile?: boolean; exiting?: boolean }) {
  const rooms = [
    { name: "Belajar Bareng UAS", live: true, count: "4/8", who: ["Rina", "Nabil", "Alya", "Fajar"] },
    { name: "Ngoding Found. AI", live: true, count: "2/8", who: ["Dita", "Yoga"] },
  ];
  return (
    <PanelShell title="Voice Rooms" icon={Mic} mobile={mobile} exiting={exiting}>
      <div className="flex-1 space-y-2.5 overflow-hidden p-3">
        {rooms.map((r, i) => (
          <div key={r.name} className={`rounded-xl border bg-card p-3 ${i === 0 ? "border-emerald-500/30" : "border-border"}`}>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold">{r.name}</p>
              {r.live && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" /> {r.count}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Avatars names={r.who} tones={DOT_TONES} />
              <span className="rounded-lg border border-primary/30 px-2.5 py-1 text-[10px] font-semibold text-primary">Gabung</span>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function ChatPanel({ msgs, mobile, exiting }: { msgs: Msg[]; mobile?: boolean; exiting?: boolean }) {
  return (
    <PanelShell title="Obrolan Kelas" icon={MessageCircle} mobile={mobile} exiting={exiting}>
      <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden p-3">
        {msgs.map((m, i) =>
          m.role === "me" ? (
            <div key={i} className="flex justify-end" style={{ animation: "fade-in-css 0.25s ease" }}>
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-1.5 text-[11px] text-white">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-1.5" style={{ animation: "fade-in-css 0.25s ease" }}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">
                {m.name?.charAt(0)}
              </span>
              <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-border bg-card px-3 py-1.5 text-[11px]">
                <span className="mb-0.5 block text-[8px] font-semibold text-muted-foreground">{m.name}</span>
                {m.text}
              </div>
            </div>
          )
        )}
      </div>
      <div className="border-t border-border p-2.5">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="flex-1 text-[10px] text-muted-foreground">Tulis pesan…</span>
          <Send className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    </PanelShell>
  );
}

function AiPanel({ msgs, thinking, input, mobile, exiting }: { msgs: Msg[]; thinking: boolean; input: string; mobile?: boolean; exiting?: boolean }) {
  return (
    <PanelShell title="haistudy AI" icon={Bot} mobile={mobile} exiting={exiting}>
      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden p-3">
        {msgs.length === 0 && !thinking && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Sparkles className="h-8 w-8 text-primary/70" />
            <p className="max-w-[14rem] text-[10px] text-muted-foreground">Tanya apa aja soal materimu.</p>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "me" ? (
            <div key={i} className="flex justify-end" style={{ animation: "fade-in-css 0.25s ease" }}>
              <div className="max-w-[82%] rounded-2xl rounded-br-md bg-secondary px-3 py-1.5 text-[11px]">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="flex gap-1.5" style={{ animation: "fade-in-css 0.25s ease" }}>
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="max-w-[86%] rounded-2xl rounded-bl-md border border-border bg-card px-3 py-1.5 text-[11px] leading-relaxed">
                {m.text}
              </div>
            </div>
          )
        )}
        {thinking && (
          <div className="flex gap-1.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60 [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border p-2.5">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className={`flex-1 text-[10px] ${input ? "text-foreground" : "text-muted-foreground"}`}>
            {input || "Tanya haistudy AI…"}
            {input && <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-foreground align-middle" />}
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Send className="h-3 w-3" />
          </span>
        </div>
      </div>
    </PanelShell>
  );
}

/* ── main ──────────────────────────────────────────────────────────────── */

export function HeroTour() {
  const { locale } = useTranslation();

  const [surface, setSurface] = useState<Surface>("dashboard");
  const [panel, setPanel] = useState<Panel>(null);
  const [panelExiting, setPanelExiting] = useState(false);
  const [activeTab, setActiveTab] = useState("materi");
  const [moreOpen, setMoreOpen] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, clicking: false, hidden: true });
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(false);

  const [chatMsgs, setChatMsgs] = useState<Msg[]>([]);
  const [aiMsgs, setAiMsgs] = useState<Msg[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiInput, setAiInput] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);

  const navRefs = {
    dashboard: useRef<HTMLButtonElement | null>(null),
    subjects: useRef<HTMLButtonElement | null>(null),
    jadwal: useRef<HTMLButtonElement | null>(null),
    statistik: useRef<HTMLButtonElement | null>(null),
    catatan: useRef<HTMLButtonElement | null>(null),
    library: useRef<HTMLButtonElement | null>(null),
  };
  const micRef = useRef<HTMLButtonElement | null>(null);
  const aiFabRef = useRef<HTMLButtonElement | null>(null);
  const chatFabRef = useRef<HTMLButtonElement | null>(null);
  const subjectCardRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = {
    materi: useRef<HTMLButtonElement | null>(null),
    rangkuman: useRef<HTMLButtonElement | null>(null),
    kilat: useRef<HTMLButtonElement | null>(null),
    latihan: useRef<HTMLButtonElement | null>(null),
    drill: useRef<HTMLButtonElement | null>(null),
  };
  const dockRefs = {
    home: useRef<HTMLButtonElement | null>(null),
    subjects: useRef<HTMLButtonElement | null>(null),
    ai: useRef<HTMLButtonElement | null>(null),
    chat: useRef<HTMLButtonElement | null>(null),
    more: useRef<HTMLButtonElement | null>(null),
  };
  const mMicRef = useRef<HTMLButtonElement | null>(null);
  const moreRefs = {
    jadwal: useRef<HTMLButtonElement | null>(null),
    statistik: useRef<HTMLButtonElement | null>(null),
    catatan: useRef<HTMLButtonElement | null>(null),
    library: useRef<HTMLButtonElement | null>(null),
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Only run the self-playing tour while it's actually on screen. Scrolled away →
  // active flips false → the animation effect below tears down (no forever loop).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setSurface("dashboard");
      setCursor((c) => ({ ...c, hidden: true }));
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
    const aiSleep = (ms: number) => sleep(ms * AI_SLOW);

    const center = (el: HTMLElement | null) => {
      const c = stageRef.current;
      if (!el || !c) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      const cr = c.getBoundingClientRect();
      return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
    };
    const moveTo = (p: { x: number; y: number } | null) => {
      if (!p) return;
      setCursor((c) => ({ ...c, x: p.x, y: p.y, hidden: false }));
    };
    const press = async () => {
      setCursor((c) => ({ ...c, clicking: true }));
      await sleep(160);
      setCursor((c) => ({ ...c, clicking: false }));
      await sleep(60);
    };
    const click = async (ref: React.RefObject<HTMLElement | null>) => {
      moveTo(center(ref.current));
      await sleep(540);
      if (cancelled) return;
      await press();
    };

    const AI_Q = "Jelasin singkat apa itu machine learning";
    const AI_A = "Machine learning itu komputer belajar dari data buat nemuin pola sendiri, tanpa diprogram manual.";
    async function playAi() {
      setAiMsgs([]);
      setAiThinking(false);
      setAiInput("");
      const qw = AI_Q.split(" ");
      for (let i = 1; i <= qw.length; i++) {
        if (cancelled) return;
        setAiInput(qw.slice(0, i).join(" "));
        await aiSleep(45);
      }
      await aiSleep(250);
      setAiInput("");
      setAiMsgs([{ role: "me", text: AI_Q }]);
      await aiSleep(400);
      setAiThinking(true);
      await aiSleep(750);
      setAiThinking(false);
      setAiMsgs((m) => [...m, { role: "ai", text: "" }]);
      const aw = AI_A.split(" ");
      for (let i = 1; i <= aw.length; i++) {
        if (cancelled) return;
        setAiMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "ai", text: aw.slice(0, i).join(" ") };
          return c;
        });
        await aiSleep(38);
      }
    }
    async function playChat() {
      setChatMsgs([]);
      const seq: Msg[] = [
        { role: "them", name: "Nabil", text: "Eh besok UAS Ops jadi jam 8 kan?" },
        { role: "me", text: "Iya jam 8, siapin cheatsheet 🙌" },
        { role: "them", name: "Alya", text: "Udah baca rangkuman bab 5 belum?" },
      ];
      for (const m of seq) {
        if (cancelled) return;
        setChatMsgs((c) => [...c, m]);
        await sleep(820);
      }
    }

    // Play the panel's slide-out, then unmount it (no instant snap).
    const closePanel = async () => {
      setPanelExiting(true);
      await sleep(390); // ≈ the 0.28s slide-out, then unmount
      if (cancelled) return;
      setPanel(null);
      setPanelExiting(false);
    };

    // Trio open (no zoom): cursor clicks the trigger, the panel slides in, plays
    // its content, then slides back out.
    async function openTrio(
      ref: React.RefObject<HTMLButtonElement | null>,
      name: Exclude<Panel, null>,
      contentFn: () => Promise<void>
    ) {
      await click(ref);
      if (cancelled) return;
      setPanel(name);
      setCursor((c) => ({ ...c, hidden: true }));
      await sleep(420);
      if (cancelled) return;
      await contentFn();
      if (cancelled) return;
      await sleep(760);
      await closePanel();
      await sleep(200);
    }

    /* ── desktop loop ── */
    async function runDesktop() {
      while (!cancelled) {
        setPanel(null);
        setMoreOpen(false);
        setActiveTab("materi");
        setSurface("dashboard");
        setCursor((c) => ({ ...c, hidden: true }));
        await sleep(700);
        if (cancelled) return;
        moveTo({ x: 330, y: 150 });
        await sleep(1100);
        if (cancelled) return;

        // trio — cursor opens each panel (voice / chat / AI), no zoom
        await openTrio(micRef, "voice", () => sleep(1900));
        if (cancelled) return;
        await openTrio(chatFabRef, "chat", playChat);
        if (cancelled) return;
        await openTrio(aiFabRef, "ai", playAi);
        if (cancelled) return;
        setCursor((c) => ({ ...c, hidden: true }));
        await sleep(500);

        // subjects → open subject → riffle tabs (skeletons, sliding underline)
        await click(navRefs.subjects);
        if (cancelled) return;
        setSurface("subjects");
        await sleep(1300);
        if (cancelled) return;
        await click(subjectCardRef);
        if (cancelled) return;
        setSurface("subject");
        setActiveTab("materi");
        await sleep(900);
        if (cancelled) return;
        for (const k of ["rangkuman", "kilat", "latihan"] as const) {
          moveTo(center(tabRefs[k].current));
          setActiveTab(k); // underline glides alongside the cursor → one continuous slide
          await sleep(280);
          if (cancelled) return;
          await press();
          await sleep(80);
          if (cancelled) return;
        }
        setCursor((c) => ({ ...c, hidden: true }));
        await sleep(650);
        if (cancelled) return;

        // jadwal / statistik / catatan / library — clean glances (no zoom)
        await click(navRefs.jadwal);
        if (cancelled) return;
        setSurface("jadwal");
        await sleep(1750);
        if (cancelled) return;

        await click(navRefs.statistik);
        if (cancelled) return;
        setSurface("statistik");
        await sleep(1950);
        if (cancelled) return;

        await click(navRefs.catatan);
        if (cancelled) return;
        setSurface("catatan");
        await sleep(1550);
        if (cancelled) return;

        await click(navRefs.library);
        if (cancelled) return;
        setSurface("library");
        await sleep(1500);
        if (cancelled) return;

        await click(navRefs.dashboard);
        if (cancelled) return;
        setSurface("dashboard");
        await sleep(850);
      }
    }

    /* ── mobile loop (panels are full-screen → no zoom) ── */
    async function runMobile() {
      while (!cancelled) {
        setPanel(null);
        setMoreOpen(false);
        setActiveTab("materi");
        setSurface("dashboard");
        setCursor((c) => ({ ...c, hidden: true }));
        await sleep(700);
        if (cancelled) return;
        moveTo({ x: 150, y: 150 });
        await sleep(1100);
        if (cancelled) return;

        await click(dockRefs.ai);
        if (cancelled) return;
        setPanel("ai");
        await playAi();
        if (cancelled) return;
        await sleep(850);
        await closePanel();
        await sleep(250);
        await click(dockRefs.chat);
        if (cancelled) return;
        setPanel("chat");
        await playChat();
        if (cancelled) return;
        await sleep(650);
        await closePanel();
        await sleep(250);
        await click(mMicRef);
        if (cancelled) return;
        setPanel("voice");
        await sleep(1900);
        if (cancelled) return;
        await closePanel();
        setCursor((c) => ({ ...c, hidden: true }));
        await sleep(480);

        await click(dockRefs.subjects);
        if (cancelled) return;
        setSurface("subjects");
        await sleep(1150);
        if (cancelled) return;
        await click(subjectCardRef);
        if (cancelled) return;
        setSurface("subject");
        setActiveTab("materi");
        await sleep(800);
        if (cancelled) return;
        for (const k of ["rangkuman", "kilat", "latihan"] as const) {
          moveTo(center(tabRefs[k].current));
          setActiveTab(k); // underline glides alongside the cursor → one continuous slide
          await sleep(280);
          if (cancelled) return;
          await press();
          await sleep(80);
          if (cancelled) return;
        }
        setCursor((c) => ({ ...c, hidden: true }));
        await sleep(600);
        if (cancelled) return;

        await click(dockRefs.more);
        if (cancelled) return;
        setMoreOpen(true);
        await sleep(650);
        if (cancelled) return;
        for (const k of ["jadwal", "statistik", "catatan", "library"] as const) {
          moveTo(center(moreRefs[k].current));
          await sleep(500);
          if (cancelled) return;
        }
        await click(moreRefs.statistik);
        if (cancelled) return;
        setMoreOpen(false);
        setSurface("statistik");
        await sleep(2100);
        if (cancelled) return;

        await click(dockRefs.home);
        if (cancelled) return;
        setSurface("dashboard");
        await sleep(850);
      }
    }

    if (isMobile) runMobile();
    else runDesktop();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, isMobile, active]);

  const renderSurface = (mobile: boolean) => {
    switch (surface) {
      case "dashboard":
        return <DashboardSurface mobile={mobile} />;
      case "subjects":
        return <SubjectsSurface cardRef={subjectCardRef} mobile={mobile} />;
      case "subject":
        return <SubjectDetailSurface activeTab={activeTab} tabRefs={tabRefs} mobile={mobile} />;
      case "jadwal":
        return <JadwalSurface mobile={mobile} />;
      case "statistik":
        return <StatistikSurface mobile={mobile} />;
      case "catatan":
        return <CatatanSurface mobile={mobile} />;
      case "library":
        return <LibrarySurface mobile={mobile} />;
    }
  };

  const renderPanel = (mobile: boolean) => {
    if (panel === "voice") return <VoicePanel mobile={mobile} exiting={panelExiting} />;
    if (panel === "chat") return <ChatPanel msgs={chatMsgs} mobile={mobile} exiting={panelExiting} />;
    if (panel === "ai") return <AiPanel msgs={aiMsgs} thinking={aiThinking} input={aiInput} mobile={mobile} exiting={panelExiting} />;
    return null;
  };

  const navActive: Surface = surface === "subject" ? "subjects" : surface;

  return (
    <BrowserWindow url="haistudy.site">
      <div ref={stageRef} className="relative h-[512px] overflow-hidden bg-background sm:h-[470px]">
        {isMobile ? (
          /* ── mobile shell ── */
          <div className="flex h-full flex-col">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
              <span className="font-display text-sm font-extrabold">
                <span className="text-primary">hai</span>study
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  ref={mMicRef}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    panel === "voice" ? "bg-primary/15 text-primary" : "text-primary"
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground">
                  <Bell className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div
                key={surface}
                className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ animation: "fade-in-css 0.35s ease" }}
              >
                {renderSurface(true)}
              </div>
              {panel && <div className="absolute inset-0 z-10 bg-black/25" style={{ animation: panelExiting ? "hs-fade-out 0.28s ease forwards" : "fade-in-css 0.28s ease" }} />}
              {renderPanel(true)}

              {moreOpen && (
                <div className="absolute inset-0 z-30 flex flex-col justify-end">
                  <div className="absolute inset-0 bg-black/40" />
                  <div
                    className="relative rounded-t-2xl border-t border-border bg-background p-3 pb-4"
                    style={{ animation: "hs-sheet-in 0.3s cubic-bezier(0.22,1,0.36,1)" }}
                  >
                    <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-muted-foreground/30" />
                    <div className="space-y-0.5">
                      {[
                        { key: "jadwal", label: "Jadwal", icon: Calendar },
                        { key: "statistik", label: "Statistik", icon: BarChart3 },
                        { key: "catatan", label: "Catatan", icon: StickyNote },
                        { key: "library", label: "Library", icon: Library },
                      ].map((m) => (
                        <button
                          key={m.key}
                          ref={moreRefs[m.key as keyof typeof moreRefs]}
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-colors ${
                            m.key === "statistik" && surface === "statistik" ? "bg-primary/10 text-primary" : "text-foreground"
                          }`}
                        >
                          <m.icon className="h-4 w-4" />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* bottom dock */}
            <div className="relative z-20 shrink-0 px-3 pb-2 pt-4">
              <div className="grid grid-cols-5 items-center rounded-2xl border border-border bg-card/95 py-1.5">
                {[
                  { key: "home", label: "Home", icon: Home, ref: dockRefs.home },
                  { key: "subjects", label: "Matkul", icon: BookOpen, ref: dockRefs.subjects },
                  { key: "ai", label: "AI", icon: Sparkles, ref: dockRefs.ai, fab: true },
                  { key: "chat", label: "Chat", icon: MessageCircle, ref: dockRefs.chat },
                  { key: "more", label: "Lainnya", icon: MoreHorizontal, ref: dockRefs.more },
                ].map((d) => {
                  const active =
                    (d.key === "home" && surface === "dashboard") ||
                    (d.key === "subjects" && (surface === "subjects" || surface === "subject")) ||
                    (d.key === "ai" && panel === "ai") ||
                    (d.key === "chat" && panel === "chat") ||
                    (d.key === "more" && moreOpen);
                  if (d.fab) {
                    return (
                      <button key={d.key} ref={d.ref} type="button" tabIndex={-1} aria-hidden="true" className="flex flex-col items-center">
                        <span
                          className={`-mt-3 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md ${
                            active ? "bg-primary ring-2 ring-primary/25" : "bg-primary"
                          }`}
                        >
                          <d.icon className="h-4 w-4" />
                        </span>
                        <span className="mt-0.5 text-[8px] text-muted-foreground">{d.label}</span>
                      </button>
                    );
                  }
                  return (
                    <button key={d.key} ref={d.ref} type="button" tabIndex={-1} aria-hidden="true" className="flex flex-col items-center gap-0.5">
                      <d.icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-[8px] ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── desktop shell ── */
          <div className="flex h-full">
            <aside className="flex w-[150px] shrink-0 flex-col border-r border-border bg-card/40 p-3">
              <div className="mb-4 flex items-center gap-2 px-1">
                <LogoMark size={18} />
                <span className="font-display text-sm font-extrabold">
                  <span className="text-primary">hai</span>study
                </span>
              </div>
              <nav className="space-y-0.5">
                {NAV.map((n) => {
                  const active = navActive === n.key;
                  return (
                    <button
                      key={n.key}
                      ref={navRefs[n.key as keyof typeof navRefs]}
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <n.icon className="h-3.5 w-3.5 shrink-0" />
                      {n.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="relative flex min-w-0 flex-1 flex-col">
              <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                  <Search className="h-3 w-3" />
                  <span>Cari materi…</span>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    ref={micRef}
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${
                      panel === "voice"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground">
                    <Music className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground">
                    <Moon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground">
                    <Bell className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              <div className="relative flex-1 overflow-hidden">
                <div key={surface} className="h-full overflow-hidden" style={{ animation: "fade-in-css 0.35s ease" }}>
                  {renderSurface(false)}
                </div>

                {panel && <div className="absolute inset-0 z-10 bg-black/20" style={{ animation: panelExiting ? "hs-fade-out 0.28s ease forwards" : "fade-in-css 0.28s ease" }} />}
                {renderPanel(false)}

                {/* bottom-right FABs (AI = Bot upper, Chat = lower) */}
                <button
                  ref={aiFabRef}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={`absolute bottom-14 right-4 z-[15] flex h-9 w-9 items-center justify-center rounded-full border shadow-md transition-colors ${
                    panel === "ai" ? "border-primary bg-primary text-white" : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  <Bot className="h-4 w-4" />
                </button>
                <button
                  ref={chatFabRef}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={`absolute bottom-3 right-4 z-[15] flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md transition-colors ${
                    panel === "chat" ? "bg-primary ring-2 ring-primary/25" : "bg-primary"
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <DemoCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} hidden={cursor.hidden} />
      </div>
    </BrowserWindow>
  );
}
