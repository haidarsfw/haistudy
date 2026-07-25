"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { AuthDivider } from "@/components/account/auth-shell";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { FieldShell } from "@/components/payments/fields/field-shell";
import { ShortAnswer } from "@/components/payments/fields/short-answer";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { sounds } from "@/lib/sounds";

export interface LoginFormProps {
  oauthError?: string | null;
  oauthEmail?: string | null;
  oauthDetail?: string | null;
  /** Same-origin path to land on after signing in. */
  next?: string | null;
}

/**
 * Sign in to an ACCOUNT.
 *
 * Two ways in, and an account has exactly one of them — chosen when it was
 * created and never changed. Every error below is written to say which one,
 * because "login gagal" is precisely the message that convinces someone their
 * account has disappeared.
 */
export function LoginForm({
  oauthError,
  oauthEmail,
  oauthDetail,
  next,
}: LoginFormProps = {}) {
  const banner = oauthError
    ? oauthErrorBanner(oauthError, oauthEmail ?? null, oauthDetail ?? null)
    : null;

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const registerHref = safeNext
    ? `/register?next=${encodeURIComponent(safeNext)}`
    : "/register";

  return (
    <div className="flex flex-col gap-5">
      <HashErrorListener />
      {banner && <ErrorBanner message={banner.message} action={banner.action} />}

      {isSupabaseConfigured && (
        <>
          <GoogleLoginButton next={safeNext} />
          <AuthDivider />
        </>
      )}

      <PasswordLoginForm next={safeNext} />

      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href={registerHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </div>
  );
}

function PasswordLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Isi email dan passwordmu dulu.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Email atau password salah");
        return;
      }

      sounds.loginSuccess();
      router.replace(next || "/account");
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1" noValidate>
      <FieldShell label="Email" htmlFor="login-email" required>
        <ShortAnswer
          id="login-email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="kamu@email.com"
          autoComplete="email"
          invalid={Boolean(error)}
        />
      </FieldShell>

      <FieldShell label="Password" htmlFor="login-password" required>
        <ShortAnswer
          id="login-password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Passwordmu"
          autoComplete="current-password"
          invalid={Boolean(error)}
        />
      </FieldShell>

      {error && (
        <div className="mt-1 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Masuk..." : "Masuk"}
      </button>

      <Link
        href="/forgot-password"
        className="mt-3 self-center rounded text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Lupa password?
      </Link>
    </form>
  );
}

interface Banner {
  message: string;
  action?: { href: string; label: string };
}

function oauthErrorBanner(
  code: string,
  email: string | null,
  detail: string | null
): Banner {
  switch (code) {
    // Used to be a dead end: "hubungi admin", with no way forward. A Google
    // address with no account here is simply someone who has not registered.
    case "email_not_linked":
      return {
        message: email
          ? `Belum ada akun untuk ${email}.`
          : "Belum ada akun untuk email itu.",
        action: { href: "/register", label: "Daftar dulu" },
      };
    case "use_password_login":
      return {
        message:
          "Akun ini dibuat dengan email dan password, bukan Google. Masuk pakai email dan passwordmu di bawah.",
      };
    case "use_key_login":
      return {
        message: "Akses ini masih pakai license key. Hubungi admin untuk dipindahkan ke akun.",
      };
    case "no_email":
      return { message: "Akun Google itu tidak memberikan alamat email. Coba akun lain." };
    case "suspended":
      return { message: "Akses terkait sedang ditangguhkan. Hubungi admin." };
    case "expired":
      return {
        message: "Aksesmu sudah habis masa berlakunya.",
        action: { href: "/#harga", label: "Perpanjang" },
      };
    case "device_limit":
      return {
        message: "Batas perangkat sudah penuh. Keluarkan salah satu perangkat dulu.",
        action: { href: "/account", label: "Atur perangkat" },
      };
    case "cancelled":
      return { message: "Login dibatalkan." };
    case "no_code":
      return { message: "Login Google tidak selesai. Coba ulang dari awal." };
    case "license_not_found":
      return { message: "Akses terkait sudah tidak ada. Hubungi admin." };
    case "not_configured":
      return { message: "Login Google belum siap. Coba masuk pakai email dan password." };
    case "exchange_failed":
      // The raw provider message used to be printed here. It means nothing to
      // a student and reads like a crash; it goes to the console instead.
      if (detail && process.env.NODE_ENV === "development") {
        console.warn("[oauth] exchange_failed:", detail);
      }
      return { message: "Login Google gagal di tengah jalan. Coba lagi." };
    case "activation_failed":
      return { message: "Gagal membuka aksesmu. Coba lagi atau hubungi admin." };
    case "server_error":
      return { message: "Ada gangguan di server saat login Google. Coba lagi." };
    default:
      return { message: "Login Google gagal. Coba lagi." };
  }
}

function ErrorBanner({ message, action }: Banner) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {message}
        {action && (
          <>
            {" "}
            <Link href={action.href} className="font-semibold underline underline-offset-2">
              {action.label}
            </Link>
          </>
        )}
      </span>
    </div>
  );
}

/**
 * Supabase can fail server-side and put the reason in the URL hash, which never
 * reaches a route handler. Read it here so the user sees something real instead
 * of a page that silently did nothing.
 */
function HashErrorListener() {
  const [hashError, setHashError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const desc = params.get("error_description");
    const code = params.get("error_code") || params.get("error");
    if (desc || code) {
      const human = desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : code!;
      setHashError(human);
      window.history.replaceState(
        {},
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);

  if (!hashError) return null;
  return <ErrorBanner message={`Login Google gagal: ${hashError}`} />;
}
