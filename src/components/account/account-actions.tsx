"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, MailWarning } from "lucide-react";

/** Real sign-out. Clears the account session and the access cookies with it. */
export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } catch {
      /* the cookies are cleared server-side; a failed call still ends here */
    }
    // Full navigation, not router.push: every provider holding session state
    // has to be torn down, not re-rendered.
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Keluar
    </button>
  );
}

/**
 * Nudge, not a wall.
 *
 * Verification blocks nothing by design — a buyer must never be stuck behind a
 * mail queue — so this is the only place that even mentions it.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const resend = async () => {
    if (state === "sending") return;
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/account/email/resend", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setState("sent");
      } else {
        setState("error");
        setMessage(data.error ?? "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setState("error");
      setMessage("Koneksi bermasalah. Coba lagi.");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-sm leading-relaxed text-foreground">
          Email <span className="font-medium">{email}</span> belum dikonfirmasi.
          <span className="text-muted-foreground">
            {" "}
            Semua tetap jalan, ini cuma supaya kamu bisa reset password kalau lupa.
          </span>
        </p>
      </div>

      {state === "sent" ? (
        <p className="shrink-0 text-sm font-medium text-primary">Terkirim, cek emailmu</p>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="shrink-0 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:self-auto"
        >
          {state === "sending" ? "Mengirim..." : "Kirim ulang"}
        </button>
      )}

      {message && <p className="text-xs text-destructive sm:hidden">{message}</p>}
    </div>
  );
}
