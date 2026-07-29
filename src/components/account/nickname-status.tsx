"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

import { normalizeNickname, validateNickname } from "@/lib/account/nickname";
import { easeEnter } from "@/lib/motion";

/**
 * "Is this name free?", answered while they type.
 *
 * A name being taken is the one thing about it a person cannot predict, and
 * the worst possible moment to find out is when they press Submit at the end
 * of a checkout. So it is checked as they go, and when it fails they are not
 * just told no — they are handed names built from their own full name, one tap
 * away.
 *
 * "unknown" is the state that matters. It means the answer never arrived —
 * offline, rate limited, server down — and it must behave like "carry on", not
 * like "taken". Our own outage is never a reason to refuse someone their name;
 * the unique index in the database is the real arbiter either way.
 */
export type NicknameState =
  | "idle"
  | "checking"
  | "ok"
  | "taken"
  | "invalid"
  | "unknown";

const DEBOUNCE_MS = 450;

export function useNicknameCheck(currentNickname: string) {
  const [state, setState] = useState<NicknameState>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only the newest request may write the answer. Without this, a slow reply
  // for "Fath" can land after a fast one for "Fathan" and mark a good name bad.
  const seq = useRef(0);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    setState("idle");
    setReason(null);
    setSuggestions([]);
  }, []);

  const check = useCallback(
    (raw: string) => {
      if (timer.current) clearTimeout(timer.current);
      const value = normalizeNickname(raw);

      // Their own name, unchanged. Nothing to ask.
      if (value && value.toLowerCase() === normalizeNickname(currentNickname).toLowerCase()) {
        seq.current += 1;
        setState("idle");
        setReason(null);
        setSuggestions([]);
        return;
      }

      const problem = validateNickname(value);
      if (problem) {
        seq.current += 1;
        setState(value ? "invalid" : "idle");
        setReason(value ? problem : null);
        setSuggestions([]);
        return;
      }

      setState("checking");
      setReason(null);
      setSuggestions([]);

      const mine = ++seq.current;
      timer.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/account/nickname/check?value=${encodeURIComponent(value)}`
          );
          const data = (await res.json()) as {
            available?: boolean | null;
            reason?: string;
            suggestions?: string[];
          };
          if (mine !== seq.current) return;

          if (data.available === true) {
            setState("ok");
            setReason(null);
            setSuggestions([]);
          } else if (data.available === false) {
            setState("taken");
            setReason(data.reason ?? "Nama panggilan ini sudah dipakai");
            setSuggestions(data.suggestions ?? []);
          } else {
            setState("unknown");
            setReason(null);
            setSuggestions([]);
          }
        } catch {
          if (mine !== seq.current) return;
          setState("unknown");
        }
      }, DEBOUNCE_MS);
    },
    [currentNickname]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { state, reason, suggestions, check, reset };
}

/** The spinner or tick that lives inside the field. */
export function NicknameAdornment({ state }: { state: NicknameState }) {
  if (state === "checking") {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  if (state === "ok") {
    return (
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.26, ease: [0.34, 1.5, 0.64, 1] }}
        className="flex text-primary"
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </motion.span>
    );
  }
  return null;
}

/** The line under the field: why it failed, and what to use instead. */
export function NicknameHint({
  state,
  reason,
  suggestions,
  onPick,
}: {
  state: NicknameState;
  reason: string | null;
  suggestions: string[];
  onPick: (value: string) => void;
}) {
  if (state === "ok") {
    return <p className="text-xs font-medium text-primary">Nama panggilan ini bisa dipakai</p>;
  }
  if (state !== "taken" && state !== "invalid") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: easeEnter }}
      className="flex flex-col gap-1.5"
    >
      <p className="text-xs text-destructive">{reason}</p>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Yang ini kosong:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
