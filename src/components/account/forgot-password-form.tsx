"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, MailCheck, MessageCircle, UserPlus } from "lucide-react";

import { AuthField, AuthSubmit } from "@/components/account/auth-field";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { WA_ADMIN } from "@/lib/payments";

type Outcome =
  | { kind: "sent"; email: string }
  | { kind: "not_found"; email: string }
  | { kind: "google"; email: string }
  | { kind: "blocked"; email: string }
  | { kind: "rate_limited"; message: string };

/**
 * Ask for a reset link.
 *
 * Answers honestly: an address with no account is told so, and an address that
 * signs in with Google is told that too, with the Google button right there.
 * The earlier version replied identically to everything so the form could not
 * be used to discover which e-mails have accounts — but that also meant
 * someone who mistyped their address sat waiting for a mail that was never
 * coming. The enumeration risk is paid for by the server's quota instead
 * (3 per hour per address, 10 per hour per network), which is counted whether
 * or not the address exists.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!email.trim()) {
      setError("Isi emailmu dulu.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        code?: string;
        email?: string;
      };

      const typed = email.trim();
      switch (data.code) {
        case "SENT":
          setOutcome({ kind: "sent", email: data.email ?? typed });
          return;
        case "NOT_FOUND":
          setOutcome({ kind: "not_found", email: typed });
          return;
        case "GOOGLE_ACCOUNT":
          setOutcome({ kind: "google", email: typed });
          return;
        // These two used to fall through to the plain red line under the field.
        // A blocked account was told to "contact admin" with no way to do it,
        // and a throttled one got a bare sentence. Both now get the same
        // explain-and-offer-a-next-step card as the other outcomes.
        case "BLOCKED":
          setOutcome({ kind: "blocked", email: typed });
          return;
        case "RATE_LIMITED":
          setOutcome({
            kind: "rate_limited",
            message: data.error ?? "Terlalu banyak permintaan. Coba lagi nanti.",
          });
          return;
        default:
          setError(data.error ?? "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (outcome?.kind === "sent") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Tautan sudah dikirim</p>
            <p className="mt-1 text-muted-foreground">
              Cek <span className="text-foreground">{outcome.email}</span>. Tautannya
              berlaku 1 jam dan cuma bisa dipakai sekali.
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground/80">
          Belum masuk setelah beberapa menit? Cek folder spam dulu.
        </p>
      </div>
    );
  }

  if (outcome?.kind === "not_found") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Belum ada akun dengan email ini</p>
            <p className="mt-1 text-muted-foreground">{outcome.email}</p>
          </div>
        </div>
        <Link
          href="/register"
          className="brand-gradient-bg inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5"
        >
          <UserPlus className="h-4 w-4" />
          Daftar sekarang
        </Link>
        <button
          type="button"
          onClick={() => setOutcome(null)}
          className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Coba email lain
        </button>
      </div>
    );
  }

  if (outcome?.kind === "google") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Akun ini masuk lewat Google</p>
            <p className="mt-1 text-muted-foreground">
              {outcome.email} tidak punya password, jadi tidak ada yang perlu diatur
              ulang. Masuk langsung pakai Google.
            </p>
          </div>
        </div>
        <GoogleLoginButton />
        <button
          type="button"
          onClick={() => setOutcome(null)}
          className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Coba email lain
        </button>
      </div>
    );
  }

  if (outcome?.kind === "blocked") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Akun ini sedang diblokir</p>
            <p className="mt-1 text-muted-foreground">
              {outcome.email} tidak bisa dipakai untuk sekarang, jadi tautan resetnya
              tidak kami kirim. Admin bisa membukanya lagi.
            </p>
          </div>
        </div>
        <a
          href={`https://wa.me/${WA_ADMIN}`}
          target="_blank"
          rel="noopener noreferrer"
          className="brand-gradient-bg inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5"
        >
          <MessageCircle className="h-4 w-4" />
          Chat admin
        </a>
        <button
          type="button"
          onClick={() => setOutcome(null)}
          className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Coba email lain
        </button>
      </div>
    );
  }

  if (outcome?.kind === "rate_limited") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Tunggu sebentar dulu</p>
            <p className="mt-1 text-muted-foreground">{outcome.message}</p>
            <p className="mt-1 text-muted-foreground">
              Kalau tautan sebelumnya sudah terkirim, cek kotak masuk dan folder
              spam — mungkin sudah ada di sana.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOutcome(null)}
          className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <AuthField
        id="forgot-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="kamu@email.com"
        autoComplete="email"
        hint="Yang kamu pakai waktu daftar"
        error={error ?? undefined}
        autoFocus
      />

      <AuthSubmit loading={loading} loadingLabel="Mengirim...">
        Kirim tautan reset
      </AuthSubmit>
    </form>
  );
}
