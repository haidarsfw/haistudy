"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Crosshair, Wand2 } from "lucide-react";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { cn } from "@/lib/utils";
import { staggerContainer } from "@/lib/motion";
import type { KilatCardProps } from "../kilat-types";
import { Tag, Feedback, Option } from "./card-bits";

const SLIDE_BASE =
  "https://gvjwxccwuyuhgexypgbn.supabase.co/storage/v1/object/public/slides";

// ─── Hotspot (tap the right spot on a diagram) ───
export function HotspotCard({ card, response, onAnswer }: KilatCardProps) {
  const c = card as Extract<KilatCard, { kind: "hotspot" }>;
  const answered = !!response;
  const chosen = (response?.data as { spot: number } | undefined)?.spot;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Crosshair className="h-4 w-4" />
        </span>
        <Tag>{c.tag || "Tunjuk di gambar"}</Tag>
      </div>
      <h2 className="font-heading text-xl font-bold leading-tight sm:text-2xl">
        {parseInline(c.question)}
      </h2>

      <div className="relative mt-4 w-full overflow-hidden rounded-xl border border-border">
        <Image
          src={`${SLIDE_BASE}/${c.image}`}
          alt=""
          width={1600}
          height={1000}
          unoptimized
          className="h-auto w-full select-none"
        />
        {c.spots.map((s, i) => {
          const show = answered && (s.correct || i === chosen);
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => !answered && onAnswer(s.correct, { spot: i })}
              aria-label={s.label || `Zona ${i + 1}`}
              className={cn(
                "absolute rounded-lg border-2 transition-colors",
                !answered && "border-transparent hover:border-primary/60 hover:bg-primary/10",
                show && s.correct && "border-emerald-500 bg-emerald-500/20",
                show && !s.correct && "border-rose-500 bg-rose-500/20"
              )}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.w}%`,
                height: `${s.h}%`,
              }}
            />
          );
        })}
      </div>
      {!answered && (
        <p className="mt-3 text-center text-xs text-muted-foreground">Tap bagian yang benar di gambar.</p>
      )}
      {answered && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>{parseInline(c.explain)}</Feedback>
      )}
    </div>
  );
}

// ─── Prompt: pick the better prompt ───
export function PromptCard({ card, response, onAnswer }: KilatCardProps) {
  const c = card as Extract<KilatCard, { kind: "prompt" }>;
  const answered = !!response;
  const chosen = (response?.data as { selected: number } | undefined)?.selected;

  const state = (idx: number) => {
    if (!answered) return "idle" as const;
    if (c.options[idx].better) return "correct" as const;
    if (idx === chosen) return "wrong" as const;
    return "dim" as const;
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wand2 className="h-4 w-4" />
        </span>
        <Tag>{c.tag || "Pilih prompt terbaik"}</Tag>
      </div>
      <h2 className="font-heading text-lg font-bold leading-snug sm:text-xl">
        {parseInline(c.goal)}
      </h2>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-col gap-2.5"
      >
        {c.options.map((opt, idx) => (
          <Option
            key={idx}
            label={<span className="italic">&ldquo;{parseInline(opt.text)}&rdquo;</span>}
            state={state(idx)}
            disabled={answered}
            onClick={() => !answered && onAnswer(opt.better, { selected: idx })}
          />
        ))}
      </motion.div>
      {answered && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>{parseInline(c.explain)}</Feedback>
      )}
    </div>
  );
}
