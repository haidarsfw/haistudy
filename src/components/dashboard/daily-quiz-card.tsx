"use client";

import { useState, useMemo } from "react";
import { HelpCircle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { sounds } from "@/lib/sounds";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import type { Subject, SubjectContent } from "@/types";

interface FlatQuestion {
  question: string;
  options: string[];
  answer: number;
  subjectId: string;
  subjectName: string;
}

function getDailyQuestion(subjects: Subject[], content: Record<string, SubjectContent>): FlatQuestion | null {
  const all: FlatQuestion[] = [];
  for (const s of subjects) {
    const c = content[s.id];
    if (!c) continue;
    for (const q of c.quiz) {
      all.push({
        question: q.question,
        options: q.options,
        answer: q.answer,
        subjectId: s.id,
        subjectName: s.name,
      });
    }
  }
  if (all.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / 86400000) % all.length;
  return all[dayIndex];
}

export function DailyQuizCard() {
  const { subjects, content } = useScopedData();
  const scopeCtx = useOptionalScope();
  const base = scopeCtx ? `/${scopeCtx.scopePath}` : "";
  const question = useMemo(() => getDailyQuestion(subjects, content), [subjects, content]);
  const [selected, setSelected] = useState<number | null>(null);

  if (!question) return null;

  const answered = selected !== null;
  const correct = selected === question.answer;

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-sm font-semibold">Quiz Harian</h3>
          <p className="text-[10px] text-muted-foreground">
            {question.subjectName}
          </p>
        </div>
      </div>

      <p className="text-sm text-foreground mb-3">{question.question}</p>

      <div className="space-y-2">
        {question.options.map((opt, i) => {
          let classes =
            "w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ";

          if (!answered) {
            classes +=
              "border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer";
          } else if (i === question.answer) {
            classes += "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
          } else if (i === selected) {
            classes += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
          } else {
            classes += "border-border opacity-50";
          }

          return (
            <button
              key={i}
              onClick={() => {
                if (answered) return;
                if (i === question.answer) { sounds.correct(); } else { sounds.wrong(); }
                setSelected(i);
              }}
              disabled={answered}
              className={classes}
            >
              <span className="flex items-center gap-2">
                {answered && i === question.answer && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
                {answered && i === selected && i !== question.answer && (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {correct ? "Benar!" : "Kurang tepat, coba lagi besok."}
          </p>
          <Link
            href={`${base}/subject/${question.subjectId}?tab=4`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Quiz lengkap <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
