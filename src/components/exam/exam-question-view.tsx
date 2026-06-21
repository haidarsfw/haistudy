"use client";

import { useRef, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";
import type { ExamQuestion, ExamSubQuestion } from "@/types/exam";
import { useTranslation } from "@/components/providers/language-provider";
import { ExamMarkdown } from "./exam-markdown";

interface Props {
  question: ExamQuestion;
  examLanguage: "en" | "id";
  /** Free-text answers (essay/case sub-answers, and T/F reasoning) by unit id. */
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  /** True/False verdicts by sub id (only used for `true-false` questions). */
  tfChoice?: Record<string, "true" | "false">;
  onTfChoice?: (subId: string, value: "true" | "false") => void;
  /** During the exam: block copy/paste/cut + text selection (anti-cheat). */
  lockCopy?: boolean;
}

/** Block clipboard + selection on rendered question text when the exam locks it. */
function RichText({
  content,
  lockCopy,
  className = "",
}: {
  content: string;
  lockCopy?: boolean;
  className?: string;
}) {
  if (!lockCopy) return <ExamMarkdown content={content} className={className} />;
  return (
    <div
      className="select-none"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ExamMarkdown content={content} className={className} />
    </div>
  );
}

function AutoTextarea({
  id,
  value,
  onChange,
  placeholder,
  lockCopy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  lockCopy?: boolean;
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

  const block = lockCopy ? (e: React.ClipboardEvent) => e.preventDefault() : undefined;

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      onPaste={block}
      onCopy={block}
      onCut={block}
      onDrop={lockCopy ? (e) => e.preventDefault() : undefined}
      placeholder={placeholder}
      rows={5}
      className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
      style={{ minHeight: 150 }}
    />
  );
}

/** Shared section header (label + title + points). */
function QuestionHeader({
  question,
  lang,
}: {
  question: ExamQuestion;
  lang: "en" | "id";
}) {
  return (
    <>
      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary/70">
        {question.sectionLabel[lang]}
      </p>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          {question.title[lang]}
        </h2>
        <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          <span className="sm:hidden">{question.points}p</span>
          <span className="hidden sm:inline">
            {question.points} {lang === "id" ? "poin" : "points"}
          </span>
        </span>
      </div>
    </>
  );
}

/**
 * Renders a single exam question. Three shapes:
 * - true-false : section intro + list of statements, each with a True/False
 *                toggle and a reasoning textarea.
 * - sub-boxes  : (case-study or multi-part essay) optional scenario + one
 *                answer box per sub-question.
 * - single     : a single prompt + one answer box.
 */
export function ExamQuestionView({
  question,
  examLanguage,
  answers,
  onAnswerChange,
  tfChoice,
  onTfChoice,
  lockCopy,
}: Props) {
  const { t } = useTranslation();
  const lang = examLanguage;

  // ── True/False group ──
  if (question.type === "true-false") {
    return (
      <div className="space-y-5">
        <QuestionHeader question={question} lang={lang} />
        {question.context && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground/90">
            <RichText content={question.context[lang]} lockCopy={lockCopy} />
          </div>
        )}
        <div className="space-y-5">
          {question.subQuestions?.map((sub, i) => (
            <TrueFalseItem
              key={sub.id}
              sub={sub}
              index={i}
              lang={lang}
              choice={tfChoice?.[sub.id]}
              reason={answers[sub.id] ?? ""}
              onChoice={(v) => onTfChoice?.(sub.id, v)}
              onReason={(v) => onAnswerChange(sub.id, v)}
              reasonPlaceholder={t("exam.tf_reason_placeholder")}
              trueLabel={t("exam.tf_true")}
              falseLabel={t("exam.tf_false")}
              lockCopy={lockCopy}
            />
          ))}
        </div>
      </div>
    );
  }

  const isCase = question.type === "case-study";

  // ── Single-prompt essay (no sub-questions) ──
  if (!question.subQuestions || question.subQuestions.length === 0) {
    return (
      <div className="space-y-4">
        <QuestionHeader question={question} lang={lang} />
        {question.context && (
          <RichText
            content={question.context[lang]}
            lockCopy={lockCopy}
            className="text-sm sm:text-base text-foreground/90"
          />
        )}
        {question.question && (
          <RichText
            content={question.question[lang]}
            lockCopy={lockCopy}
            className="text-sm sm:text-base text-foreground/90"
          />
        )}
        <AutoTextarea
          id={`answer-${question.id}`}
          value={answers[question.id] ?? ""}
          onChange={(v) => onAnswerChange(question.id, v)}
          placeholder={t("exam.answer_placeholder")}
          lockCopy={lockCopy}
        />
      </div>
    );
  }

  // ── Sub-boxes (case study, or multi-part essay) ──
  return (
    <div className="space-y-5">
      <QuestionHeader question={question} lang={lang} />

      {question.context &&
        (isCase ? (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("exam.scenario")}
            </p>
            <RichText
              content={question.context[lang]}
              lockCopy={lockCopy}
              className="text-sm text-foreground/90"
            />
          </div>
        ) : (
          <RichText
            content={question.context[lang]}
            lockCopy={lockCopy}
            className="text-sm sm:text-base text-foreground/90"
          />
        ))}

      {question.subQuestions.map((sub, i) => (
        <SubQuestionView
          key={sub.id}
          sub={sub}
          index={i}
          lang={lang}
          answer={answers[sub.id] ?? ""}
          onAnswerChange={onAnswerChange}
          placeholder={t("exam.answer_placeholder")}
          lockCopy={lockCopy}
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
  lockCopy,
}: {
  sub: ExamSubQuestion;
  index: number;
  lang: "en" | "id";
  answer: string;
  onAnswerChange: (qid: string, val: string) => void;
  placeholder: string;
  lockCopy?: boolean;
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
              <span className="sm:hidden">{sub.points}p</span>
              <span className="hidden sm:inline">
                {sub.points} {lang === "id" ? "poin" : "points"}
              </span>
            </span>
          </div>
          <RichText
            content={sub.question[lang]}
            lockCopy={lockCopy}
            className="text-sm text-foreground/90"
          />
        </div>
      </div>
      <AutoTextarea
        id={`answer-${sub.id}`}
        value={answer}
        onChange={(v) => onAnswerChange(sub.id, v)}
        placeholder={placeholder}
        lockCopy={lockCopy}
      />
    </div>
  );
}

function TrueFalseItem({
  sub,
  index,
  lang,
  choice,
  reason,
  onChoice,
  onReason,
  reasonPlaceholder,
  trueLabel,
  falseLabel,
  lockCopy,
}: {
  sub: ExamSubQuestion;
  index: number;
  lang: "en" | "id";
  choice: "true" | "false" | undefined;
  reason: string;
  onChoice: (v: "true" | "false") => void;
  onReason: (v: string) => void;
  reasonPlaceholder: string;
  trueLabel: string;
  falseLabel: string;
  lockCopy?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="mb-1">
            <span className="text-[10px] font-bold text-muted-foreground">
              <span className="sm:hidden">{sub.points}p</span>
              <span className="hidden sm:inline">
                {sub.points} {lang === "id" ? "poin" : "points"}
              </span>
            </span>
          </div>
          <RichText
            content={sub.question[lang]}
            lockCopy={lockCopy}
            className="text-sm text-foreground/90"
          />
        </div>
      </div>

      {/* True / False segmented control */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChoice("true")}
          aria-pressed={choice === "true"}
          className={`hs-press flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
            choice === "true"
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Check className="h-4 w-4" />
          {trueLabel}
        </button>
        <button
          type="button"
          onClick={() => onChoice("false")}
          aria-pressed={choice === "false"}
          className={`hs-press flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
            choice === "false"
              ? "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/40 dark:text-red-400"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <X className="h-4 w-4" />
          {falseLabel}
        </button>
      </div>

      <AutoTextarea
        id={`reason-${sub.id}`}
        value={reason}
        onChange={onReason}
        placeholder={reasonPlaceholder}
        lockCopy={lockCopy}
      />
    </div>
  );
}
