"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { passwordChecks } from "@/lib/auth/password-rules";

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
  onBlur,
  placeholder,
  autoComplete,
  hint,
  error,
  autoFocus,
  maxLength = 200,
  trailing,
  disabled,
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
  autoFocus?: boolean;
  maxLength?: number;
  /** Status adornment inside the field, e.g. a spinner or a tick. */
  trailing?: React.ReactNode;
  /** Readable but not editable. The hint has to say why. */
  disabled?: boolean;
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
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-11 w-full rounded-xl border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50",
            "focus:border-primary focus:ring-2 focus:ring-primary/25",
            "disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground",
            (isPassword || trailing) && "pr-11",
            invalid ? "border-destructive/60" : "border-border"
          )}
        />
        {trailing && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        )}
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

/**
 * Live checklist under a new-password field.
 *
 * A fixed 2×2 grid. Every rule is present from the first paint and none of
 * them ever enters or leaves — only the colour changes and the dot swaps for a
 * tick. That is the whole design, and it is deliberate.
 *
 * The previous version animated `height` on a `layout` list, held each
 * satisfied rule on screen for 700ms and then slid it out. Three separate
 * things were wrong with that: the block resized under a focused input so the
 * page moved while you typed, the 700ms gap meant the movement arrived long
 * after the keystroke that caused it, and the list emptying out removed the
 * very information someone re-reads when they backspace. Products that keep
 * composition rules (GitHub, Apple, Atlassian) all keep the list still.
 *
 * Nothing here animates layout. Transform and opacity only, so it never costs
 * a reflow and never shifts a neighbour.
 */
export function PasswordChecklist({
  password,
  id,
}: {
  password: string;
  id?: string;
}) {
  const checks = passwordChecks(password);
  const allOk = checks.every((c) => c.ok);

  return (
    <>
      <div
        id={id}
        aria-hidden="true"
        className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1"
      >
        {checks.map((c) => (
          <PasswordRule key={c.id} label={c.short} ok={c.ok} />
        ))}
      </div>
      {/* Announced once, at the end. A live region on the grid itself would
          re-read all four rules on every single keystroke. */}
      <span role="status" className="sr-only">
        {password && allOk ? "Password sudah memenuhi syarat" : ""}
      </span>
    </>
  );
}

function PasswordRule({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[11px] leading-4 transition-colors duration-200",
        ok ? "text-primary" : "text-muted-foreground/55"
      )}
    >
      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        <motion.span
          className="absolute h-1.5 w-1.5 rounded-full bg-current"
          initial={false}
          animate={{ opacity: ok ? 0 : 1, scale: ok ? 0.3 : 1 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        />
        <motion.span
          className="absolute flex items-center justify-center"
          initial={false}
          animate={{ opacity: ok ? 1 : 0, scale: ok ? 1 : 0.4 }}
          // Slight overshoot: the tick lands with a small pop, which is the
          // only motion in the component and the only one it needs.
          transition={{ duration: 0.24, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </motion.span>
      </span>
      {label}
    </span>
  );
}

/**
 * Something that grows into view instead of appearing.
 *
 * Used for the fields that only matter once an e-mail has been typed, and for
 * the referral disclosure. Height plus opacity, 260ms, with the contents held
 * still by an inner wrapper so the text does not squash on the way in.
 *
 * This is the one place a height animation is right: it is a deliberate reveal
 * the user asked for by typing or tapping, not a list quietly resizing under a
 * cursor. `overflow-hidden` only while moving, so a focus ring on a settled
 * field is never clipped.
 */
export function Reveal({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const [moving, setMoving] = useState(false);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          onAnimationStart={() => setMoving(true)}
          onAnimationComplete={() => setMoving(false)}
          transition={{
            height: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.2, ease: "easeOut" },
          }}
          className={moving ? "overflow-hidden" : undefined}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A slot that always occupies the same height, whether or not it holds an
 * error.
 *
 * Without it the card grows the moment a wrong password comes back: the button
 * jumps out from under the cursor, and on a short screen the whole form
 * shifts. Reserving the space costs one thin empty strip and buys a card that
 * never moves. The message fades in place rather than pushing anything.
 */
export function AuthErrorSlot({ message }: { message?: string | null }) {
  return (
    // Exactly one line tall. It shares a row with "Lupa password?", so the
    // reserved space costs nothing at all when empty — an earlier version gave
    // it a block of its own and left a visible hole in the middle of the card.
    <div className="min-h-[1.125rem] flex-1">
      <motion.p
        initial={false}
        animate={{ opacity: message ? 1 : 0, y: message ? 0 : -2 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex items-start gap-1.5 text-[12px] font-medium leading-snug text-destructive"
        role={message ? "alert" : undefined}
      >
        {message && (
          <>
            <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            <span>{message}</span>
          </>
        )}
      </motion.p>
    </div>
  );
}

/** The primary action on an auth card. Same gradient as the landing's CTA. */
export function AuthSubmit({
  loading,
  disabled,
  children,
  loadingLabel,
}: {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
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
