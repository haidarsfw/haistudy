"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { AuthField, AuthSubmit } from "@/components/account/auth-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
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
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {banner && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      <AuthField
        id="reset-password"
        label="Password baru"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Password baru"
        autoComplete="new-password"
        hint={`Min. ${PASSWORD_MIN_LENGTH} karakter`}
        error={errors.password}
        autoFocus
      />

      <AuthField
        id="reset-confirm"
        label="Ulangi password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Ketik ulang"
        autoComplete="new-password"
        error={errors.confirm}
      />

      <AuthSubmit loading={loading} loadingLabel="Menyimpan...">
        Simpan password baru
      </AuthSubmit>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
        Semua perangkat lain akan dikeluarkan dari akunmu setelah ini.
      </p>
    </form>
  );
}
