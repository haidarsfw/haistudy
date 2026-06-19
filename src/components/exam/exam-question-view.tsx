"use client";

import { useRef, useEffect, useCallback } from "react";
import type { ExamQuestion, ExamSubQuestion } from "@/types/exam";
import { useTranslation } from "@/components/providers/language-provider";

interface Props {
  question: ExamQuestion;
  /** Which sub-question is active (only for case-study). Null = show the whole question. */
  activeSubId?: string | null;
  examLanguage: "en" | "id";
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
}

function AutoTextarea({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(150, el.scrollHeight) + "px";
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      placeholder={placeholder}
      rows={5}
      className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
      style={{ minHeight: 150 }}
    />
  );
}

/**
 * Renders a single exam question (essay or case-study) with textarea inputs.
 */
export function ExamQuestionView({
  question,
  examLanguage,
  answers,
  onAnswerChange,
}: Props) {
  const { t } = useTranslation();
  const lang = examLanguage;

  if (question.type === "essay") {
    return (
      <div className="space-y-4">
        {/* Section label */}
        <p className="text-xs font-bold uppercase tracking-wider text-primary/70">
          {question.sectionLabel[lang]}
        </p>

        {/* Title with points */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">
            {question.title[lang]}
          </h2>
          <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {question.points}p
          </span>
        </div>

        {/* Question text */}
        {question.question && (
          <p className="leading-relaxed text-foreground/90">
            {question.question[lang]}
          </p>
        )}

        {/* Answer textarea */}
        <AutoTextarea
          id={`answer-${question.id}`}
          value={answers[question.id] ?? ""}
          onChange={(v) => onAnswerChange(question.id, v)}
          placeholder={t("exam.answer_placeholder")}
        />
      </div>
    );
  }

  // Case study
  return (
    <div className="space-y-5">
      {/* Section label */}
      <p className="text-xs font-bold uppercase tracking-wider text-primary/70">
        {question.sectionLabel[lang]}
      </p>

      {/* Title with points */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">
          {question.title[lang]}
        </h2>
        <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          {question.points}p
        </span>
      </div>

      {/* Case study context */}
      {question.context && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Scenario
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {question.context[lang]}
          </p>
        </div>
      )}

      {/* Sub-questions */}
      {question.subQuestions?.map((sub, i) => (
        <SubQuestionView
          key={sub.id}
          sub={sub}
          index={i}
          lang={lang}
          answer={answers[sub.id] ?? ""}
          onAnswerChange={onAnswerChange}
          placeholder={t("exam.answer_placeholder")}
        />
      ))}
    </div>
  );
}

function SubQuestionView({
  sub,
  index,
  lang,
  answer,
  onAnswerChange,
  placeholder,
}: {
  sub: ExamSubQuestion;
  index: number;
  lang: "en" | "id";
  answer: string;
  onAnswerChange: (qid: string, val: string) => void;
  placeholder: string;
}) {
  const letter = String.fromCharCode(97 + index); // a, b, c

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {letter}
        </span>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground">
              {sub.points}p
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {sub.question[lang]}
          </p>
        </div>
      </div>
      <AutoTextarea
        id={`answer-${sub.id}`}
        value={answer}
        onChange={(v) => onAnswerChange(sub.id, v)}
        placeholder={placeholder}
      />
    </div>
  );
}
