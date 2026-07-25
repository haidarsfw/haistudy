"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { FieldShell } from "@/components/payments/fields/field-shell";
import { ShortAnswer } from "@/components/payments/fields/short-answer";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { sounds } from "@/lib/sounds";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrors({});
    setBanner(null);

    const local: Record<string, string> = {};
    if (password.length < PASSWORD_MIN_LENGTH) {
      local.password = `Minimal ${PASSWORD_MIN_LENGTH} karakter`;
    }
    if (confirm !== password) local.confirm = "Passwordnya belum sama";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; code?: string };

      if (!res.ok || !data.ok) {
        if (data.code === "BAD_TOKEN") setExpired(true);
        else setBanner(data.error ?? "Gagal menyimpan. Coba lagi.");
        return;
      }

      sounds.loginSuccess();
      // The reset signs them straight back in, so there is nowhere to send them
      // except into their account.
      router.replace("/account");
    } catch {
      setBanner("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (expired || !token) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Tautannya sudah kedaluwarsa atau pernah dipakai. Tautan reset cuma berlaku 1
            jam dan sekali pakai.
          </span>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Minta tautan baru
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1" noValidate>
      {banner && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      <FieldShell
        label="Password baru"
        htmlFor="reset-password"
        required
        description={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
        error={errors.password}
      >
        <ShortAnswer
          id="reset-password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Password baru"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
        />
      </FieldShell>

      <FieldShell
        label="Ulangi password"
        htmlFor="reset-confirm"
        required
        error={errors.confirm}
      >
        <ShortAnswer
          id="reset-confirm"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Ketik ulang"
          autoComplete="new-password"
          invalid={Boolean(errors.confirm)}
        />
      </FieldShell>

      <button
        type="submit"
        disabled={loading}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Menyimpan..." : "Simpan password baru"}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground/80">
        Semua perangkat lain akan dikeluarkan dari akunmu setelah ini.
      </p>
    </form>
  );
}
