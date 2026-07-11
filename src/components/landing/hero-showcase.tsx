"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Zap,
  ClipboardCheck,
  Sparkles,
  MessagesSquare,
  Check,
  Highlighter,
  Mic,
  ArrowUp,
} from "lucide-react";
import { LogoMark } from "@/components/landing/logo";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "rangkuman", label: "Rangkuman", icon: FileText, Screen: RangkumanScreen },
  { id: "kilat", label: "Belajar Kilat", icon: Zap, Screen: KilatScreen },
  { id: "latihan", label: "Latihan Soal", icon: ClipboardCheck, Screen: LatihanScreen },
  { id: "ai", label: "Tanya AI", icon: Sparkles, Screen: AiScreen },
  { id: "komunitas", label: "Komunitas", icon: MessagesSquare, Screen: KomunitasScreen },
];

// Auto-rotating tour of every feature — brief glimpses, so a passive visitor
// still sees what haistudy does. Static under reduced-motion.
export function HeroShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % VIEWS.length), 3400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* sidebar */}
      <aside className="hidden w-[168px] shrink-0 flex-col gap-1 border-r border-border/70 bg-card/40 p-3 sm:flex">
        <div className="mb-2 flex items-center gap-2 px-1.5">
          <LogoMark size={20} />
          <span className="font-display text-sm font-bold tracking-[-0.02em]">
            <span className="text-brand-gradient">hai</span>
            <span className="text-foreground">study</span>
          </span>
        </div>
        <SideItem icon={LayoutDashboard} label="Dashboard" />
        {VIEWS.map((v, i) => (
          <SideItem
            key={v.id}
            icon={v.icon}
            label={v.label}
            active={i === active}
          />
        ))}
      </aside>

      {/* main */}
      <div className="relative min-w-0 flex-1">
        {VIEWS.map((v, i) => {
          const Screen = v.Screen;
          return (
            <div
              key={v.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                i === active ? "opacity-100" : "pointer-events-none opacity-0"
              )}
              aria-hidden={i !== active}
            >
              <Screen />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SideItem({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof FileText;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-accent text-primary"
          : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function ScreenShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">haistudy</span>
        <span>/</span>
        <span className="font-semibold text-foreground">{title}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Bar({ w = "100%", dim }: { w?: string; dim?: boolean }) {
  return (
    <div
      className={cn("h-2 rounded-full", dim ? "bg-muted" : "bg-muted-foreground/25")}
      style={{ width: w }}
    />
  );
}

function RangkumanScreen() {
  return (
    <ScreenShell title="Rangkuman">
      <div className="flex h-full flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Statistik I — Modul 3</p>
          <div className="space-y-2.5">
            <Bar w="92%" />
            <div className="relative">
              <span className="rounded bg-primary/15 px-1 text-sm leading-6 text-foreground">
                Rata-rata sampel mendekati rata-rata populasi seiring n membesar.
              </span>
              <span className="brand-gradient-bg absolute -right-1 -top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                <Sparkles className="h-2.5 w-2.5" /> Tanya AI
              </span>
            </div>
            <Bar w="78%" />
            <Bar w="85%" dim />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Highlighter className="h-3.5 w-3.5" /> Mode:
          </span>
          {["Ringkas", "Standar", "Mendalam"].map((m, i) => (
            <span
              key={m}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                i === 0
                  ? "brand-gradient-bg text-white"
                  : "border border-border text-muted-foreground"
              )}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

function KilatScreen() {
  return (
    <ScreenShell title="Belajar Kilat">
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="relative w-full max-w-[280px]">
          <div className="absolute inset-x-3 -bottom-2 h-full rounded-2xl border border-border bg-card/50" />
          <div className="relative rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="text-xs font-medium text-primary">Business Economics</span>
            <p className="mt-2 text-base font-semibold leading-snug">
              Apa yang terjadi pada kurva permintaan saat harga naik?
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Geser untuk lihat jawabannya →
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i < 2 ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

function LatihanScreen() {
  const opts = ["Kurva bergeser ke kiri", "Jumlah diminta menurun", "Permintaan naik"];
  return (
    <ScreenShell title="Latihan Soal">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary">
            Soal 2 / 5
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Dikoreksi AI
          </span>
        </div>
        <p className="text-sm font-semibold">
          Ketika harga suatu barang naik, apa yang terjadi?
        </p>
        <div className="space-y-2">
          {opts.map((o, i) => (
            <div
              key={o}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
                i === 1
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  i === 1 ? "brand-gradient-bg text-white" : "border border-border"
                )}
              >
                {i === 1 ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
              </span>
              {o}
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-xl bg-accent px-3 py-2 text-xs text-accent-foreground">
          Simulasi ujian nyata — soal esai pun otomatis dinilai AI dengan skor.
        </div>
      </div>
    </ScreenShell>
  );
}

function AiScreen() {
  return (
    <ScreenShell title="Tanya haistudy AI">
      <div className="flex h-full flex-col justify-end gap-3">
        <div className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
          Jelasin bedanya biaya tetap sama biaya variabel dong
        </div>
        <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          Biaya tetap nggak berubah walau produksi naik-turun, misalnya sewa
          gedung. Biaya variabel ikut berubah sama volume, contohnya bahan baku.
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
          <span className="flex-1 truncate text-sm text-muted-foreground">
            Tanya apa aja soal materimu...
          </span>
          <span className="brand-gradient-bg flex h-6 w-6 items-center justify-center rounded-full text-white">
            <ArrowUp className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </ScreenShell>
  );
}

function KomunitasScreen() {
  return (
    <ScreenShell title="Komunitas Kelas">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <span className="brand-gradient-bg flex h-9 w-9 items-center justify-center rounded-full text-white">
            <Mic className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Voice room: Ngebut Statistik</p>
            <p className="text-xs text-muted-foreground">3 orang belajar bareng</p>
          </div>
          <div className="flex -space-x-2">
            {["A", "R", "D"].map((n) => (
              <span
                key={n}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-bold text-primary"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm">
            Ada yang udah ngerjain latihan soal bab 4?
          </div>
          <div className="max-w-[75%] self-end rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground ml-auto">
            Udah! Lumayan kepake pas simulasi 🔥
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
