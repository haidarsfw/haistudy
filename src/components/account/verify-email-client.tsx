"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type State = "working" | "done" | "failed";

/**
 * Spends the verification token on mount.
 *
 * The whole point of verification is that it costs the user one tap in their
 * mail app, so there is no button here — arriving is the action.
 */
export function VerifyEmailClient({ token }: { token: string }) {
  const [state, setState] = useState<State>(token ? "working" : "failed");
  const [email, setEmail] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    // React runs effects twice in development; the token is single-use, so a
    // second call would always report failure on a link that just worked.
    ran.current = true;

    (async () => {
      try {
        const res = await fetch("/api/account/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { ok?: boolean; email?: string };
        if (res.ok && data.ok) {
          setEmail(data.email ?? null);
          setState("done");
        } else {
          setState("failed");
        }
      } catch {
        setState("failed");
      }
    })();
  }, [token]);

  if (state === "working") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Sebentar, sedang dicek...
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Email kamu terkonfirmasi</p>
            {email && <p className="mt-1 text-muted-foreground">{email}</p>}
          </div>
        </div>
        <Link
          href="/account"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Buka akunku
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Tautannya sudah kedaluwarsa atau pernah dipakai. Kalau emailmu memang sudah
          pernah dikonfirmasi, tidak ada yang perlu kamu lakukan.
        </span>
      </div>
      <Link
        href="/account"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Buka akunku
      </Link>
    </div>
  );
}
