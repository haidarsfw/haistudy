"use client";

import { useMemo, useState, useEffect } from "react";
import { Lightbulb, Sparkles, Shield, FlaskConical, Crown, Gem } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { getAllProgress, calcOverallProgress as calcOverall } from "@/lib/progress";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { scopeFullLabel } from "@/lib/scope";
import { resolveRole, getRoleNameClass } from "@/lib/role-colors";
import * as greetingS1Uts from "@/data/s1/uts/bm/greeting-content";
import * as greetingS1Uas from "@/data/s1/uas/bm/greeting-content";
import * as greetingS2Uts from "@/data/s2/uts/bm/greeting-content";
import * as greetingS2Uas from "@/data/s2/uas/bm/greeting-content";

// Scope-keyed greeting content. Static imports keep tips in first paint and let
// Turbopack code-split per scope. Add a new scope here when its folder exists.
const GREETING_BY_SCOPE: Record<
  string,
  { TIPS: readonly string[]; FUN_FACTS: readonly string[] }
> = {
  "s1-uts-bm": greetingS1Uts,
  "s1-uas-bm": greetingS1Uas,
  "s2-uts-bm": greetingS2Uts,
  "s2-uas-bm": greetingS2Uas,
};


function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "greeting.morning";
  if (hour < 15) return "greeting.afternoon";
  if (hour < 18) return "greeting.evening";
  return "greeting.night";
}

function getMotivation(progress: number): string {
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    if (progress < 50) return "Weekend ini waktu yang tepat untuk mengejar ketinggalan!";
    return "Weekend? Waktunya review flashcards!";
  }
  if (progress === 0) return "Yuk mulai belajar hari ini!";
  if (progress < 25) return "Langkah pertama sudah dimulai, teruskan!";
  if (progress < 50) return "Sudah ada progress - terus semangat!";
  if (progress < 75) return "Lebih dari setengah jalan, keren!";
  if (progress < 100) return "Sedikit lagi menuju 100%!";
  return "Semua materi sudah selesai - kamu luar biasa!";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}



function ProgressRing({ percent }: { percent: number }) {
  const r = 36;
  const stroke = 5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  const size = (r + stroke) * 2;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

export function GreetingCard() {
  const { session } = useSession();
  const { t } = useTranslation();
  const { subjects, content } = useScopedData();
  const scopeCtx = useOptionalScope();
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const calc = () => calcOverall(getAllProgress(), subjects, content);
    setOverallProgress(calc());

    const handleSync = () => setOverallProgress(calc());
    window.addEventListener("hs-progress-synced", handleSync);
    window.addEventListener("hs-progress-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("hs-progress-synced", handleSync);
      window.removeEventListener("hs-progress-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [subjects, content]);

  // Scope-aware tips & fun facts - keyed by full scope-key (NOT examPeriod) so
  // each scope is isolated. Static per-scope so the tip is in first paint.
  const greeting =
    (scopeCtx ? GREETING_BY_SCOPE[scopeCtx.scopeKey] : undefined) ?? greetingS2Uts;
  const rotationIndex = Math.floor(Date.now() / (6 * 3600 * 1000));
  const tipsArr = greeting.TIPS;
  const factsArr = greeting.FUN_FACTS;
  const tip = tipsArr[rotationIndex % tipsArr.length];
  const funFact = factsArr[rotationIndex % factsArr.length];

  const greetingKey = useMemo(() => getGreetingKey(), []);
  const motivation = useMemo(
    () => getMotivation(overallProgress),
    [overallProgress]
  );
  const dateStr = useMemo(() => getFormattedDate(), []);

  return (
    <div
      data-onboarding="dashboard"
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 light-card-shadow"
    >
      <div className="flex items-center gap-6">
        {/* Left: text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">{dateStr}</p>
            {session?.isAdmin && (
              <Badge variant="admin-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <Shield className="h-2.5 w-2.5" />
                {t("badge.admin")}
              </Badge>
            )}
            {(session?.packageTier === "diamond") && (
              <Badge variant="diamond-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <Gem className="h-2.5 w-2.5" />
                Diamond
              </Badge>
            )}
            {session?.packageTier === "vip" && (
              <Badge variant="vip-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <Crown className="h-2.5 w-2.5" />
                {t("badge.vip")}
              </Badge>
            )}
            {session?.isTester && (
              <Badge variant="tester-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <FlaskConical className="h-2.5 w-2.5" />
                {t("badge.tester")}
              </Badge>
            )}
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold mt-1 break-words">
            {t(greetingKey)},{" "}
            <span
              className={getRoleNameClass(
                resolveRole({
                  isAdmin: session?.isAdmin,
                  isTester: session?.isTester,
                  packageTier: session?.packageTier,
                })
              )}
            >
              {session?.shortName || "Student"}
            </span>
            !
          </h2>
          <p className="mt-1 text-sm text-muted-foreground break-words">{motivation}</p>

        </div>

        {/* Right: progress ring */}
        <div className="shrink-0 hidden sm:block">
          <ProgressRing percent={overallProgress} />
        </div>
      </div>

      {/* Divider with scope context */}
      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        {scopeCtx && (
          <span className="text-[10px] text-muted-foreground/80 whitespace-nowrap">
            {scopeFullLabel(scopeCtx.scope)}
          </span>
        )}
      </div>

      {/* Study tip + fun fact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Lightbulb className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("dashboard.study_tip")}
            </h3>
            <p className="text-sm text-foreground leading-relaxed break-words">
              {tip}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("dashboard.fun_fact")}
            </h3>
            <p className="text-sm text-foreground leading-relaxed break-words">
              {funFact}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
