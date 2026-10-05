"use client";

import { useCallback, useState } from "react";
import { Loader2, MailWarning } from "@/components/ui/icons";

/**
 * "Your e-mail is not confirmed yet", in the three sizes the flow needs.
 *
 * Confirming is never a wall at signup — an account works the moment it is
 * created, and nobody is stranded behind a mail queue at 2am. It is a condition
 * on the ORDER being approved, which is a different thing and happens later.
 * Everything here is conditional on that: a buyer who has confirmed never sees
 * a single one of these, which is the only reason showing it in four places
 * does not read as nagging.
 *
 * Three shapes, one voice:
 *   Box    — right after signing up, and on the "order received" screen. Full
 *            explanation plus the button, because those are the two moments
 *            someone will actually go and open their mail.
 *   Inline — one quiet line in the checkout review. Deliberately NOT a warning
 *            box: interrupting someone mid-payment with an alert is friction at
 *            the worst possible moment, and they cannot fix it without leaving
 *            the form. But it has to be said before money moves, because being
 *            told afterwards is worse.
 *   Banner — the standing reminder on /account.
 */
type ResendState = "idle" | "sending" | "sent" | "error";

function useResendVerify() {
  const [state, setState] = useState<ResendState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const resend = useCallback(async () => {
    if (state === "sending" || state === "sent") return;
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/account/email/resend", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setState("sent");
      } else {
        // The cooldown message is the useful one — it says how long, so it is
        // shown as-is rather than flattened into "gagal".
        setState("error");
        setMessage(data.error ?? "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setState("error");
      setMessage("Koneksi bermasalah. Coba lagi.");
    }
  }, [state]);

  return { state, message, resend };
}

function ResendButton({
  state,
  onClick,
  className = "",
}: {
  state: ResendState;
  onClick: () => void;
  className?: string;
}) {
  if (state === "sent") {
    return (
      <p className={`shrink-0 text-xs font-semibold text-primary ${className}`}>
        Terkirim, cek emailmu
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "sending"}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      {state === "sending" && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === "sending" ? "Mengirim..." : "Kirim ulang"}
    </button>
  );
}

/** Full box. Signup success, and the screen after an order is submitted. */
export function VerifyEmailBox({
  email,
  context = "signup",
  mailSent = true,
}: {
  email: string;
  /** Changes only the consequence sentence, never the ask. */
  context?: "signup" | "order";
  /**
   * Did the confirmation mail actually leave?
   *
   * The register endpoint waits for the send and reports the answer, and until
   * now nothing read it — so on the one occasion the mail failed, the screen
   * still said "Kami kirim tautan konfirmasi ke ..." about a message that never
   * existed, and the reader was left waiting for it. Seen for real in this
   * round: a transient Resend error, logged server-side, invisible on screen.
   * The resend button was always there; the sentence above it just had to stop
   * claiming something that had not happened.
   */
  mailSent?: boolean;
}) {
  const { state, message, resend } = useResendVerify();
  // Once they press the button themselves, the failure is history.
  const gagal = !mailSent && state !== "sent";

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-left">
      <div className="flex items-start gap-2.5">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {gagal ? "Email konfirmasi gagal terkirim" : "Cek emailmu dulu"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {gagal ? (
              <>
                Kami belum berhasil mengirim tautan konfirmasi ke{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Akunmu tetap aman dan sudah jadi — coba kirim ulang sebentar lagi.
              </>
            ) : (
              <>
                Kami kirim tautan konfirmasi ke{" "}
                <span className="font-medium text-foreground">{email}</span>.{" "}
                {context === "order"
                  ? "Pesananmu sudah masuk, tapi baru bisa kami setujui setelah kamu klik tautan itu."
                  : "Klik tautannya supaya pesananmu nanti bisa langsung kami setujui."}
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ResendButton state={state} onClick={resend} />
            {message && (
              <p className="text-xs leading-relaxed text-destructive">{message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** One quiet line. The checkout review step, next to the submit button. */
export function VerifyEmailInline({ email }: { email: string }) {
  const { state, message, resend } = useResendVerify();

  return (
    <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
      Email <span className="font-medium text-foreground">{email}</span> belum
      dikonfirmasi. Pesanan tetap bisa dikirim, tapi baru bisa disetujui setelah kamu
      klik tautan di email dari kami.{" "}
      {state === "sent" ? (
        <span className="font-semibold text-primary">Terkirim, cek emailmu.</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="rounded font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {state === "sending" ? "Mengirim..." : "Kirim ulang"}
        </button>
      )}
      {message && <span className="text-destructive"> {message}</span>}
    </p>
  );
}

/** The standing reminder on /account. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const { state, message, resend } = useResendVerify();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-sm leading-relaxed text-foreground">
          Email <span className="font-medium">{email}</span> belum dikonfirmasi.
          <span className="text-muted-foreground">
            {" "}
            Aplikasi tetap jalan, tapi pesanan baru bisa kami setujui setelah kamu klik
            tautannya.
          </span>
        </p>
      </div>

      <ResendButton state={state} onClick={resend} className="self-start sm:self-auto" />
      {message && <p className="text-xs text-destructive sm:hidden">{message}</p>}
    </div>
  );
}
