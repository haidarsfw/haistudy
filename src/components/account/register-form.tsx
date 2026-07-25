"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { AuthDivider } from "@/components/account/auth-shell";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { FieldShell } from "@/components/payments/fields/field-shell";
import { ShortAnswer } from "@/components/payments/fields/short-answer";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { sounds } from "@/lib/sounds";

/**
 * Create an account.
 *
 * Two fields only, matching exactly what signing in with Google hands over, so
 * neither path asks for more than the other. Everything a purchase needs
 * (nama, panggilan, WhatsApp, kampus, kelas) is collected once at the first
 * checkout and kept on the account from then on.
 */
export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrors({});
    setBanner(null);

    // Mirrors the server. Only saves a round trip; the server re-checks.
    const local: Record<string, string> = {};
    if (!email.trim()) local.email = "Email wajib diisi";
    if (password.length < PASSWORD_MIN_LENGTH) {
      local.password = `Minimal ${PASSWORD_MIN_LENGTH} karakter`;
    }
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          // The address doubles as the display name until checkout collects a
          // real one. Better than an empty greeting in the verification mail.
          fullName: email.trim().split("@")[0],
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        field?: string;
      };

      if (!res.ok || !data.ok) {
        if (data.field) setErrors({ [data.field]: data.error ?? "Tidak valid" });
        else setBanner(data.error ?? "Gagal membuat akun. Coba lagi.");
        return;
      }

      sounds.loginSuccess();
      router.replace(next || "/account");
    } catch {
      setBanner("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {banner && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {isSupabaseConfigured && (
        <>
          <GoogleLoginButton next={next} label="Daftar dengan Google" />
          <AuthDivider />
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-1" noValidate>
        <FieldShell label="Email" htmlFor="reg-email" required error={errors.email}>
          <ShortAnswer
            id="reg-email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="kamu@email.com"
            autoComplete="email"
            invalid={Boolean(errors.email)}
          />
        </FieldShell>

        <FieldShell
          label="Password"
          htmlFor="reg-password"
          required
          description={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
          error={errors.password}
        >
          <ShortAnswer
            id="reg-password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Buat password"
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
          />
        </FieldShell>

        <button
          type="submit"
          disabled={loading}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Membuat akun..." : "Daftar"}
        </button>
      </form>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80">
        Dengan mendaftar kamu setuju dengan{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Ketentuan Layanan
        </Link>{" "}
        dan{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Kebijakan Privasi
        </Link>
        .
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href={loginHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
