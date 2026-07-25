"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A field for the auth forms.
 *
 * Not `FieldShell` from the payments kit: that one bottom-pins its control and
 * floats the error out of flow so inputs stay aligned across a grid row. Auth
 * forms are a single narrow column, so all that buys here is a permanent 20px
 * hole under every input, which is what made the login card look so airy and
 * unfinished.
 */
export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  hint,
  error,
  autoFocus,
  maxLength = 200,
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const invalid = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        {hint && !error && (
          <span className="text-[11px] text-muted-foreground/70">{hint}</span>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-11 w-full rounded-xl border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50",
            "focus:border-primary focus:ring-2 focus:ring-primary/25",
            isPassword && "pr-11",
            invalid ? "border-destructive/60" : "border-border"
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            tabIndex={-1}
            aria-label={reveal ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** The primary action on an auth card. Same gradient as the landing's CTA. */
export function AuthSubmit({
  loading,
  children,
  loadingLabel,
}: {
  loading?: boolean;
  children: React.ReactNode;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="brand-gradient-bg mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}

/**
 * Why not to sign in from a private tab.
 *
 * Each private window starts with empty storage, so it looks like a brand new
 * device every single time and quietly eats a device slot that vanishes when
 * the window closes. This warning is the cheapest fix there is, and it stays
 * until the device-confirmation screen lands in stage 3.
 */
export function IncognitoNote() {
  return (
    <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
      Hindari masuk lewat incognito / private tab. Setiap sesi incognito dihitung
      sebagai perangkat baru dan bisa menghabiskan jatah perangkatmu.
    </p>
  );
}
