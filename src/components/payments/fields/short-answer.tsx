"use client";

import { cn } from "@/lib/utils";

interface ShortAnswerProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "tel" | "email";
  inputMode?: "text" | "tel" | "email" | "numeric";
  maxLength?: number;
  autoComplete?: string;
  invalid?: boolean;
}

const baseClass =
  "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/30";

export function ShortAnswer({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength = 200,
  autoComplete,
  invalid,
}: ShortAnswerProps) {
  return (
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      value={value}
      maxLength={maxLength}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      className={cn(baseClass, invalid ? "border-destructive/60" : "border-border")}
    />
  );
}
