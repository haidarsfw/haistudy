"use client";

import { createElement } from "react";
import { motion } from "framer-motion";
import { Flag, Quote } from "@/components/ui/icons";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { scaleIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";
import { iconFor, Tag } from "./card-bits";

export function IntroCard({ card }: { card: Extract<KilatCard, { kind: "intro" }> }) {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Bab {card.chapter}
      </p>
      <h2 className="flex items-center justify-center gap-2 font-heading text-2xl font-bold sm:text-3xl">
        <Flag className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" />
        {card.title}
      </h2>
      {card.subtitle && (
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          {card.subtitle}
        </p>
      )}
    </motion.div>
  );
}

export function ExplainCard({ card }: { card: Extract<KilatCard, { kind: "explain" }> }) {
  return (
    <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="visible">
      {card.tag && (
        <motion.div variants={staggerItem} className="mb-3">
          <Tag>{card.tag}</Tag>
        </motion.div>
      )}
      <motion.h2
        variants={staggerItem}
        className="flex items-start gap-2.5 font-heading text-xl font-bold leading-tight sm:text-2xl"
      >
        {createElement(iconFor(card.icon), { className: "mt-0.5 h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" })}
        <span className="min-w-0">{parseInline(card.heading)}</span>
      </motion.h2>
      <motion.p
        variants={staggerItem}
        className="mt-3 text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]"
      >
        {parseInline(card.body)}
      </motion.p>
    </motion.div>
  );
}

export function QuoteCard({ card }: { card: Extract<KilatCard, { kind: "quote" }> }) {
  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <Quote className="h-9 w-9 text-primary/40" />
      <blockquote className="mt-3 font-heading text-2xl font-semibold leading-snug sm:text-[28px]">
        {parseInline(card.text)}
      </blockquote>
      {card.source && (
        <p className="mt-4 text-sm font-medium text-muted-foreground">{card.source}</p>
      )}
    </motion.div>
  );
}
