"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  /** Greyed-out, non-interactive (e.g. a device count not allowed for the chosen package). */
  disabled?: boolean;
  /** Shown as a tooltip on hover/tap when this option is disabled. */
  disabledHint?: string;
}

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly RadioOption[];
  columns?: 1 | 2 | 3 | 4;
  /**
   * Column count below `sm`. Four campuses in one row is right on desktop and
   * unreadable on a phone, so the two are stated separately.
   */
  columnsMobile?: 1 | 2;
  /**
   * "default" — boxed row with a radio dot (+ optional description).
   * "plain"   — dot + label, NO box. For use inside a Section, where the
   *             section is already the box; a border per option there just
   *             multiplies boxes without separating anything.
   * "tile"    — compact, content centered both axes, equal height, no dot.
   *             Used for short same-shape choices (e.g. device count).
   */
  variant?: "default" | "plain" | "tile";
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  columns = 1,
  columnsMobile,
  variant = "default",
}: RadioGroupProps) {
  // Written out rather than composed, because Tailwind only ships the classes it
  // can see as whole strings in the source.
  const base =
    columnsMobile === 2 ? "grid-cols-2" : "grid-cols-1";
  const up =
    columns === 4
      ? "sm:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-3"
        : columns === 2
          ? "sm:grid-cols-2"
          : "sm:grid-cols-1";
  const gridClass = columnsMobile ? `${base} ${up}` : up.replace("sm:", "");

  if (variant === "tile") {
    return (
      <TileGroup
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        gridClass={gridClass}
      />
    );
  }

  const plain = variant === "plain";

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
              "flex items-start gap-2.5 text-left transition-colors",
              plain
                // No border, no fill: the dot carries the state. Padding stays
                // so the tap target is still a row, not just the label.
                ? "-mx-1.5 rounded-lg px-1.5 py-1.5 hover:bg-muted/40"
                : cn(
                    "rounded-xl border px-3.5 py-2.5",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/30 hover:bg-muted/40"
                  )
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

function TileGroup({
  name,
  value,
  onChange,
  options,
  gridClass,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly RadioOption[];
  gridClass: string;
}) {
  // Which disabled tile currently shows its hint via tap (mobile).
  const [hintFor, setHintFor] = useState<string | null>(null);

  return (
    <div className={cn("grid items-stretch gap-2", gridClass)} role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const selected = value === o.value;
        const disabled = !!o.disabled;
        const hasHint = disabled && !!o.disabledHint;
        return (
          <div key={o.value} className="group relative">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled}
              // Keep it focus/hover/tap-able when it carries a hint; only hard-disable
              // hintless options so existing behaviour is preserved.
              disabled={disabled && !hasHint}
              onClick={() => {
                if (disabled) {
                  if (hasHint) setHintFor((c) => (c === o.value ? null : o.value));
                  return;
                }
                onChange(o.value);
              }}
              onBlur={() => setHintFor((c) => (c === o.value ? null : c))}
              className={cn(
                "flex h-full min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-3 text-center transition-all",
                disabled
                  ? "cursor-not-allowed border-border opacity-40"
                  : selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-muted/40"
              )}
            >
              <span className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>
                {o.label}
              </span>
              {o.description && (
                <span className="text-[11px] leading-tight text-muted-foreground">{o.description}</span>
              )}
            </button>
            {hasHint && (
              <span
                role="tooltip"
                className={cn(
                  "pointer-events-none absolute -top-1.5 left-1/2 z-30 w-max max-w-[13rem] -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-background shadow-lg transition-opacity duration-150",
                  "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                  hintFor === o.value && "opacity-100"
                )}
              >
                {o.disabledHint}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
