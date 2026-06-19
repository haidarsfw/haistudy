"use client";

import { motion } from "framer-motion";
import { Check, X, SkipForward, Lock, Circle, Link2, RotateCcw, ListTree } from "lucide-react";
import type { KilatCard, KilatChapter } from "@/types";
import { cn } from "@/lib/utils";
import { springSmooth } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { CardStatus } from "./use-kilat";

// Outline label for a card. Card-data fields (title/heading/tag) are content and
// stay as-authored; only the generic fallback labels are translated.
function cardLabel(card: KilatCard, t: (k: string) => string): string {
  switch (card.kind) {
    case "intro": return card.title;
    case "explain": return card.heading;
    case "quote": return t("kilat.lbl_quote");
    case "check": return t("kilat.tag_check");
    case "checkpoint": return card.title;
    case "scenario": return card.tag || t("kilat.tag_scenario");
    case "match": return t("kilat.lbl_match");
    case "fill": return t("kilat.lbl_fill");
    case "multi": return t("kilat.tag_multi");
    case "order": return t("kilat.lbl_order");
    case "categorize": return t("kilat.tag_categorize");
    case "swipe": return t("kilat.lbl_swipe");
    case "calc": return t("kilat.tag_calc");
    case "table": return card.title || t("kilat.lbl_table");
    case "hotspot": return t("kilat.tag_hotspot");
    case "prompt": return t("kilat.lbl_prompt");
    default: return t("kilat.lbl_card");
  }
}

function StatusIcon({ status }: { status: CardStatus }) {
  switch (status) {
    case "correct": return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    case "wrong": return <X className="h-3.5 w-3.5 text-rose-500" />;
    case "skipped": return <SkipForward className="h-3.5 w-3.5 text-amber-500" />;
    case "done": return <Link2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "locked": return <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />;
    default: return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
  }
}

interface Props {
  chapters: KilatChapter[];
  cards: KilatCard[];
  index: number;
  cardStatus: (i: number) => CardStatus;
  onJump: (i: number) => void;
  onClose: () => void;
  onRestart: () => void;
}

export function KilatOutline({ chapters, cards, index, cardStatus, onJump, onClose, onRestart }: Props) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={springSmooth}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[82%] flex-col rounded-t-2xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ListTree className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-sm font-bold">{t("kilat.toc")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="hs-press ml-auto flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("kilat.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {chapters.map((ch) => (
            <div key={ch.n} className="mb-3">
              <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("kilat.chapter")} {ch.n}: {ch.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {cards
                  .map((c, i) => ({ c, i }))
                  .filter((x) => x.c.chapter === ch.n)
                  .map(({ c, i }) => {
                    const status = cardStatus(i);
                    const locked = status === "locked";
                    const isCurrent = i === index;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={locked}
                        onClick={() => onJump(i)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                          locked && "opacity-50",
                          isCurrent ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
                        )}
                      >
                        <StatusIcon status={status} />
                        <span className="line-clamp-1 flex-1">{cardLabel(c, t)}</span>
                        {isCurrent && <span className="text-[10px] uppercase">{t("kilat.here")}</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <ConfirmDialog
            className="flex w-full"
            title={t("kilat.restart_confirm_title")}
            description={t("kilat.restart_confirm_desc")}
            onConfirm={onRestart}
            trigger={
              <button
                type="button"
                className="hs-press flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" /> {t("kilat.restart")}
              </button>
            }
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
