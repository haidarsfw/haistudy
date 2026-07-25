"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";

import { AuthField, AuthSubmit } from "@/components/account/auth-field";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
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
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Gagal mengirim. Coba lagi.");
        return;
      }
      setSent(true);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // The server answers identically whether or not the address exists, so this
  // screen has to as well — anything more specific would turn the form into a
  // way to check which e-mails have accounts here. The Google line covers the
  // one case that would otherwise leave someone waiting for a mail that is
  // never coming.
  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm leading-relaxed text-foreground">
            <p className="font-semibold">Cek emailmu</p>
            <p className="mt-1 text-muted-foreground">
              Kalau <span className="text-foreground">{email.trim()}</span> terdaftar
              dengan password, tautan untuk membuat password baru sudah dikirim ke sana.
              Tautannya berlaku 1 jam.
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Akunmu daftar lewat Google? Tidak ada password untuk diatur ulang, langsung
          saja{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            masuk dengan Google
          </Link>
          .
        </p>

        <p className="text-xs leading-relaxed text-muted-foreground/80">
          Emailnya belum masuk setelah beberapa menit? Cek folder spam, lalu coba lagi.
        </p>
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
