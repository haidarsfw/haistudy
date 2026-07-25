"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Gift } from "lucide-react";

import { AuthDivider } from "@/components/account/auth-shell";
import {
  AuthField,
  AuthSubmit,
  PasswordChecklist,
} from "@/components/account/auth-field";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isPasswordStrong } from "@/lib/auth/password-rules";
import { sounds } from "@/lib/sounds";

/**
 * Create an account.
 *
 * Two fields, matching exactly what signing in with Google hands over, so
 * neither path asks for more than the other. Everything a purchase needs
 * (nama, panggilan, WhatsApp, kampus, kelas) is collected once at the first
 * checkout and kept on the account from then on.
 */
export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [showReferral, setShowReferral] = useState(false);
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
    if (!isPasswordStrong(password)) local.password = "Password belum memenuhi syarat";
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
          // No name is sent. Deriving one from the address produced things
          // like "akunfotoalkhalifah" and then greeted people by it across the
          // whole site. The real name is collected once at checkout or in the
          // account page, and until then nothing pretends to know it.
          referralCode: referral.trim() || undefined,
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

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <AuthField
          id="reg-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="kamu@email.com"
          autoComplete="email"
          error={errors.email}
        />

        <div className="flex flex-col gap-2">
          <AuthField
            id="reg-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Buat password"
            autoComplete="new-password"
            error={errors.password}
          />
          <PasswordChecklist password={password} />
        </div>

        {showReferral ? (
          <AuthField
            id="reg-referral"
            label="Kode referral"
            value={referral}
            onChange={(v) => setReferral(v.toUpperCase())}
            placeholder="Punya kode dari teman?"
            autoComplete="off"
            maxLength={32}
            hint="Opsional"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowReferral(true)}
            className="-mt-1 flex items-center gap-1.5 self-start rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Gift className="h-3.5 w-3.5" />
            Punya kode referral?
          </button>
        )}

        {/* Locked until every rule is green. The checklist above already says
            what is missing, so a rejection round trip would add nothing. */}
        <AuthSubmit
          loading={loading}
          disabled={!isPasswordStrong(password) || !email.trim()}
          loadingLabel="Membuat akun..."
        >
          Daftar
        </AuthSubmit>
      </form>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
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

      <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </div>
    </div>
  );
}
