"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortAnswerProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "tel" | "email" | "password";
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
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  const input = (
    <input
      id={id}
      type={isPassword && reveal ? "text" : type}
      inputMode={inputMode}
      value={value}
      maxLength={maxLength}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      className={cn(
        baseClass,
        invalid ? "border-destructive/60" : "border-border",
        // Room for the reveal toggle so long passwords don't run under it.
        isPassword && "pr-11"
      )}
    />
  );

  if (!isPassword) return input;

  return (
    <div className="relative">
      {input}
      {/*
        A password you cannot check is a password you mistype. This one is set
        once at checkout and only surfaces again after approval, so a typo here
        costs the buyer a reset round-trip with the admin.
      */}
      <button
        type="button"
        onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? "Sembunyikan password" : "Lihat password"}
        aria-pressed={reveal}
        // -translate-y-1/2 off a 50% top keeps it centred whatever the input height.
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
