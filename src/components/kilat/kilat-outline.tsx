"use client";

import { motion } from "framer-motion";
import { Check, X, SkipForward, Lock, Circle, Link2, RotateCcw, ListTree } from "lucide-react";
import type { KilatCard, KilatChapter } from "@/types";
import { cn } from "@/lib/utils";
import { springSmooth } from "@/lib/motion";
import type { CardStatus } from "./use-kilat";

function cardLabel(card: KilatCard): string {
  switch (card.kind) {
    case "intro": return card.title;
    case "explain": return card.heading;
    case "quote": return "Kutipan";
    case "check": return "Cek cepat";
    case "checkpoint": return card.title;
    case "scenario": return card.tag || "Skenario";
    case "match": return "Jodohin istilah";
    case "fill": return "Isi bagian kosong";
    case "multi": return "Pilih semua yang benar";
    case "order": return "Urutkan langkah";
    case "categorize": return "Kategorikan";
    case "swipe": return "Benar atau salah";
    case "calc": return "Hitung";
    case "table": return card.title || "Tabel";
    case "hotspot": return "Tunjuk di gambar";
    case "prompt": return "Pilih prompt";
    default: return "Kartu";
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
          <h3 className="font-heading text-sm font-bold">Daftar isi</h3>
          <button
            type="button"
            onClick={onClose}
            className="hs-press ml-auto flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {chapters.map((ch) => (
            <div key={ch.n} className="mb-3">
              <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Bab {ch.n}: {ch.title}
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
                        <span className="line-clamp-1 flex-1">{cardLabel(c)}</span>
                        {isCurrent && <span className="text-[10px] uppercase">di sini</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onRestart}
            className="hs-press flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Ulang dari awal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
