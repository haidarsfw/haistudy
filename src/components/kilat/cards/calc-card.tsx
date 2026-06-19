"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, ChevronRight } from "lucide-react";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { cn } from "@/lib/utils";
import { staggerContainer } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import type { KilatCardProps } from "../kilat-types";
import { Tag, Feedback, Option, singleState } from "./card-bits";

function normNum(s: string): number | null {
  const cleaned = s.replace(/\s/g, "").replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function Steps({ steps }: { steps?: string[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <details className="group mt-3 rounded-xl border border-border bg-muted/40">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-sm font-semibold">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        Lihat langkah
      </summary>
      <div className="space-y-1 px-4 pb-3 text-sm leading-relaxed text-foreground/80">
        {steps.map((s, i) => (
          <p key={i}>{parseInline(s)}</p>
        ))}
      </div>
    </details>
  );
}

export function CalcCard({ card, response, onAnswer }: KilatCardProps) {
  const { t } = useTranslation();
  const c = card as Extract<KilatCard, { kind: "calc" }>;
  const answered = !!response;
  const [typed, setTyped] = useState("");

  const header = (
    <>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calculator className="h-4 w-4" />
        </span>
        <Tag>{c.tag || t("kilat.tag_calc")}</Tag>
      </div>
      <h2 className="font-heading text-xl font-bold leading-tight sm:text-2xl">
        {parseInline(c.question)}
      </h2>
      {c.formula && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border-l-[3px] border-primary/50 bg-primary/5 px-3 py-2">
          <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary/70">
            Rumus
          </span>
          <span className="text-sm leading-relaxed">{parseInline(c.formula)}</span>
        </div>
      )}
    </>
  );

  if (c.mode === "pick") {
    const chosen = (response?.data as { selected: number } | undefined)?.selected;
    return (
      <div>
        {header}
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="visible"
          className="mt-5 flex flex-col gap-2.5"
        >
          {c.options.map((opt, idx) => (
            <Option
              key={idx}
              label={<span className="font-mono">{parseInline(opt)}</span>}
              state={singleState(answered, idx, c.answer, chosen)}
              disabled={answered}
              onClick={() => !answered && onAnswer(idx === c.answer, { selected: idx })}
            />
          ))}
        </motion.div>
        {answered && (
          <>
            <Feedback tone={response!.correct ? "correct" : "wrong"}>{parseInline(c.explain)}</Feedback>
            <Steps steps={c.steps} />
          </>
        )}
      </div>
    );
  }

  // mode "type"
  const submit = () => {
    if (answered) return;
    const u = normNum(typed);
    const a = normNum(c.answer);
    const ok = u !== null && a !== null && Math.abs(u - a) <= Math.max(0.02, Math.abs(a) * 0.001);
    onAnswer(ok, { value: typed });
  };
  const shownVal = answered ? ((response?.data as { value: string } | undefined)?.value ?? "") : typed;

  return (
    <div>
      {header}
      <div className="mt-5 flex items-center gap-2">
        <input
          inputMode="decimal"
          value={shownVal}
          disabled={answered}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("kilat.calc_placeholder")}
          className={cn(
            "h-12 flex-1 rounded-xl border bg-card px-4 text-lg font-mono outline-none transition-colors focus:border-primary",
            answered
              ? response!.correct
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-rose-500/50 bg-rose-500/10"
              : "border-border"
          )}
        />
        {c.unit && <span className="text-sm font-medium text-muted-foreground">{c.unit}</span>}
      </div>
      {!answered && (
        <button
          type="button"
          onClick={submit}
          disabled={typed.trim() === ""}
          className="hs-press mt-4 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Cek jawaban
        </button>
      )}
      {answered && (
        <>
          <Feedback tone={response!.correct ? "correct" : "wrong"}>
            {response!.correct ? parseInline(c.explain) : <>{t("kilat.calc_correct_answer")} <b className="font-mono">{c.answer}{c.unit ? ` ${c.unit}` : ""}</b>. {parseInline(c.explain)}</>}
          </Feedback>
          <Steps steps={c.steps} />
        </>
      )}
    </div>
  );
}
