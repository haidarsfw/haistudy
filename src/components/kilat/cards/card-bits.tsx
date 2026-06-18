"use client";

import { motion } from "framer-motion";
import {
  Shield, Lock, Scale, Gavel, Eye, Wifi, Globe, FlaskConical, Dna, Users,
  ListChecks, Home, Megaphone, ShieldAlert, AlertTriangle, Brain, HeartCrack,
  EyeOff, Leaf, TrendingUp, TrendingDown, Recycle, Sprout, Handshake, ShieldCheck,
  FileCheck, Building2, Sparkles, Check, X, Flag, MapPin, Boxes, Package,
  Factory, Truck, Calculator, Gauge, Wrench, ClipboardList, Table, Receipt,
  DollarSign, FileSpreadsheet, Bot, Cpu, Network, MessageSquare, Image, Lightbulb,
  Target, Layers, Clock, ShoppingCart, BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeInUp, tapScale } from "@/lib/motion";

// Content carries lucide icon names; resolve to a component (fallback Sparkles).
const ICONS: Record<string, LucideIcon> = {
  Shield, Lock, Scale, Gavel, Eye, Wifi, Globe, FlaskConical, Dna, Users,
  ListChecks, Home, Megaphone, ShieldAlert, AlertTriangle, Brain, HeartCrack,
  EyeOff, Leaf, TrendingUp, TrendingDown, Recycle, Sprout, Handshake, ShieldCheck,
  FileCheck, Building2, MapPin, Boxes, Package, Factory, Truck, Calculator, Gauge,
  Wrench, ClipboardList, Table, Receipt, DollarSign, FileSpreadsheet, Bot, Cpu,
  Network, MessageSquare, Image, Lightbulb, Target, Layers, Clock, ShoppingCart,
  BadgeCheck, Sparkles, Flag,
};

export function iconFor(name?: string): LucideIcon {
  return (name && ICONS[name]) || Sparkles;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}

// Feedback callout. tone: correct (green), wrong (amber), neutral (muted).
export function Feedback({
  tone,
  children,
}: {
  tone: "correct" | "wrong" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "mt-4 flex gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tone === "correct" &&
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        tone === "wrong" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
        tone === "neutral" && "border-border bg-muted/50 text-foreground/80"
      )}
    >
      <span className="mt-0.5 shrink-0">
        {tone === "correct" ? (
          <Check className="h-4 w-4" />
        ) : tone === "wrong" ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </span>
      <span>{children}</span>
    </motion.div>
  );
}

export type OptState = "idle" | "correct" | "wrong" | "dim" | "selected";

const OPT_CLASS: Record<OptState, string> = {
  idle: "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
  selected: "border-primary bg-primary/10 text-primary ring-2 ring-primary/30",
  correct: "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  wrong: "border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  dim: "border-border bg-card opacity-50",
};

export function Option({
  label,
  state,
  onClick,
  disabled,
}: {
  label: React.ReactNode;
  state: OptState;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : tapScale}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors",
        OPT_CLASS[state]
      )}
    >
      <span className="flex-1">{label}</span>
      {state === "correct" && <Check className="h-4 w-4 shrink-0" />}
      {state === "wrong" && <X className="h-4 w-4 shrink-0" />}
    </motion.button>
  );
}

// Deterministic shuffle seeded by a string (e.g. card id). Pure - safe to call
// during render (no Math.random), and stable across re-renders / resume.
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rng = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Standard reveal state for a single-correct option list.
export function singleState(
  answered: boolean,
  idx: number,
  correctIdx: number,
  chosenIdx: number | undefined
): OptState {
  if (!answered) return "idle";
  if (idx === correctIdx) return "correct";
  if (idx === chosenIdx) return "wrong";
  return "dim";
}
