"use client";

import { cn } from "@/lib/utils";

interface LongAnswerProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  invalid?: boolean;
}

export function LongAnswer({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength = 1000,
  invalid,
}: LongAnswerProps) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/30",
        invalid ? "border-destructive/60" : "border-border"
      )}
    />
  );
}
