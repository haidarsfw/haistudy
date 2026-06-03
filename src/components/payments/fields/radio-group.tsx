"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly RadioOption[];
  columns?: 1 | 2 | 3;
  /**
   * "default" — left-aligned with a radio dot (+ optional description).
   * "tile"    — compact, content centered both axes, equal height, no dot.
   *             Used for short same-shape choices (e.g. device count).
   */
  variant?: "default" | "tile";
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  columns = 1,
  variant = "default",
}: RadioGroupProps) {
  const gridClass =
    columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1";

  if (variant === "tile") {
    return (
      <div className={cn("grid items-stretch gap-2", gridClass)} role="radiogroup" aria-label={name}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex h-full min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-3 text-center transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/30 hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  selected ? "text-primary" : "text-foreground"
                )}
              >
                {o.label}
              </span>
              {o.description && (
                <span className="text-[11px] leading-tight text-muted-foreground">{o.description}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2", gridClass)} role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/30 hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
              )}
            >
              {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{o.label}</span>
              {o.description && (
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {o.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
