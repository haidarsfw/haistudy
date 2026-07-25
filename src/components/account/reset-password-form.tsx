"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import {
  AuthField,
  AuthSubmit,
  PasswordChecklist,
} from "@/components/account/auth-field";
import { isPasswordStrong } from "@/lib/auth/password-rules";
import { sounds } from "@/lib/sounds";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrors({});
    setBanner(null);

    const local: Record<string, string> = {};
    if (!isPasswordStrong(password)) local.password = "Password belum memenuhi syarat";
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
      // Deliberately does NOT jump straight to /account. Changing a password
      // is a security action, and landing somewhere else with no word about it
      // leaves you unsure it even worked — especially about the part where
      // every other device was signed out.
      setDone(true);
    } catch {
      setBanner("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Password berhasil diubah</p>
            <p className="mt-1 text-muted-foreground">
              Kamu sudah otomatis masuk di perangkat ini. Semua perangkat lain sudah
              dikeluarkan dari akunmu.
            </p>
          </div>
        </div>
        <Link
          href="/account"
          className="brand-gradient-bg inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5"
        >
          Ke akunku
        </Link>
      </div>
    );
  }

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

      <div className="flex flex-col gap-2">
        <AuthField
          id="reset-password"
          label="Password baru"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Password baru"
          autoComplete="new-password"
          error={errors.password}
          autoFocus
        />
        <PasswordChecklist password={password} />
      </div>

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

      <AuthSubmit
        loading={loading}
        disabled={!isPasswordStrong(password) || confirm !== password}
        loadingLabel="Menyimpan..."
      >
        Simpan password baru
      </AuthSubmit>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
        Semua perangkat lain akan dikeluarkan dari akunmu setelah ini.
      </p>
    </form>
  );
}
