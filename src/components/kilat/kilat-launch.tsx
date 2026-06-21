"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap, Star, Target, Play, RotateCcw, Check, Sparkles, Layers, Hand, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/language-provider";
import { useScope } from "@/components/providers/scope-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useProgress } from "@/hooks/use-progress";
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/motion";
import { isGraded } from "./kilat-types";

export function KilatLaunch({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const { scopePath } = useScope();
  const { kilat, kilatLoaded } = useScopedData();
  const { progress } = useProgress(subjectId);
  const { t } = useTranslation();

  const feed = kilat[subjectId];
  const total = feed?.cards.length ?? 0;

  const kp = progress.kilat;
  const started = !!kp;
  const completed = kp?.completed ?? false;
  const reachedCards = kp ? Math.min(kp.reached + 1, total) : 0;
  const pct = total > 0 ? Math.round((reachedCards / total) * 100) : 0;
  const gradedTotal = feed ? feed.cards.filter(isGraded).length * 10 : 0;
  const points = kp?.points ?? 0;
  const scorePct = gradedTotal > 0 ? Math.round((points / gradedTotal) * 100) : 0;
  const passed = started && scorePct >= 90;

  // A chapter is "done" once every card in it has been reached (explored), so
  // the checkmarks stay in sync with the % explored and the player's bar.
  const reachedIdx = kp?.reached ?? -1;
  const perChapter = useMemo(() => {
    if (!feed) return [];
    return feed.chapters.map((ch) => {
      const idxs = feed.cards
        .map((c, i) => (c.chapter === ch.n ? i : -1))
        .filter((i) => i >= 0);
      const maxIdx = idxs.length ? Math.max(...idxs) : -1;
      return {
        ...ch,
        count: idxs.length,
        done: started && maxIdx >= 0 && reachedIdx >= maxIdx,
      };
    });
  }, [feed, reachedIdx, started]);
  const babDone = perChapter.filter((c) => c.done).length;

  if (!kilatLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!feed) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t("kilat.unavailable")}
      </p>
    );
  }

  const start = () => router.push(`/${scopePath}/subject/${subjectId}/kilat`);

  return (
    <div className="mx-auto max-w-3xl py-6">
      {/* Hero */}
      <motion.div
        variants={staggerContainer(0.07)}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-center shadow-warm"
      >
        <motion.div variants={staggerItem} className="flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Zap className="h-5 w-5 fill-primary" />
          </span>
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {t("kilat.badge_new")}
          </span>
        </motion.div>
        <motion.h2 variants={staggerItem} className="mt-3 font-heading text-2xl font-bold">
          {t("kilat.title")}
        </motion.h2>
        <motion.p variants={staggerItem} className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("kilat.launch_desc")}
        </motion.p>

        {/* Mini feature row */}
        <motion.div variants={staggerItem} className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Hand className="h-3.5 w-3.5 text-primary" /> {t("kilat.feat_swipe")}</span>
          <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> {t("kilat.feat_quiz")}</span>
          <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> {total} {t("kilat.cards")}, {feed.chapters.length} {t("kilat.chapters")}</span>
        </motion.div>
      </motion.div>

      {/* Progress (only once started) */}
      {started && (
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-warm">
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              {completed ? t("kilat.done") : t("kilat.progress")}
              {passed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-3 w-3" /> {t("kilat.passed")}
                </span>
              )}
            </span>
            <span className="tabular-nums">{pct}% {t("kilat.explored")}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              <Target className="h-3.5 w-3.5" /> {t("kilat.score")} {scorePct}%
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              <Star className="h-3.5 w-3.5 fill-primary" /> {points}/{gradedTotal} {t("kilat.points")}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
              <Check className="h-3.5 w-3.5" /> {babDone}/{feed.chapters.length} {t("kilat.chapters")}
            </span>
          </div>
        </motion.div>
      )}

      {/* Chapter list (2-col on desktop to fill width + cut scrolling) */}
      <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="visible" className="mt-4 grid gap-2 sm:grid-cols-2">
        {perChapter.map((ch, i) => {
          // A lone last chapter (odd count) spans both columns + stays centered,
          // so it sits as one full-width card aligned under the pair above it.
          const lastOdd = perChapter.length % 2 === 1 && i === perChapter.length - 1;
          return (
            <motion.div
              key={ch.n}
              variants={staggerItem}
              className={`flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 ${lastOdd ? "sm:col-span-2" : ""}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${ch.done ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}>
                {ch.done ? <Check className="h-4 w-4" /> : ch.n}
              </span>
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold">{ch.title}</p>
                <p className="truncate text-xs text-muted-foreground">{ch.count} {t("kilat.cards")}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTA */}
      <div className="mt-5 sm:mx-auto sm:max-w-md">
        <Button size="lg" onClick={start} className="h-12 w-full text-sm">
          {completed ? (
            <><RotateCcw className="h-4 w-4" /> {t("kilat.cta_restart")}</>
          ) : started ? (
            <><Play className="h-4 w-4 fill-current" /> {t("kilat.cta_continue")}</>
          ) : (
            <><Play className="h-4 w-4 fill-current" /> {t("kilat.cta_start")}</>
          )}
        </Button>
      </div>
    </div>
  );
}
