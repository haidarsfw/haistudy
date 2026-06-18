"use client";

import { createElement } from "react";
import { motion } from "framer-motion";
import { Flag, Quote } from "lucide-react";
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
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-warm">
        <Flag className="h-8 w-8" />
      </div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Bab {card.chapter}
      </p>
      <h2 className="font-heading text-2xl font-bold sm:text-3xl">{card.title}</h2>
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
      <motion.div
        variants={staggerItem}
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-warm"
      >
        {createElement(iconFor(card.icon), { className: "h-7 w-7" })}
      </motion.div>
      {card.tag && (
        <motion.div variants={staggerItem} className="mb-3">
          <Tag>{card.tag}</Tag>
        </motion.div>
      )}
      <motion.h2
        variants={staggerItem}
        className="font-heading text-xl font-bold leading-tight sm:text-2xl"
      >
        {parseInline(card.heading)}
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
