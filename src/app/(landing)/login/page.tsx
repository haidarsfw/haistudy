import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth_error?: string; email?: string; detail?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
      </div>
      <div className="w-full max-w-sm">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-7 shadow-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              <span className="text-primary">hai</span>study
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk ke akunmu
            </p>
          </div>

          <LoginForm
            oauthError={params.oauth_error ?? null}
            oauthEmail={params.email ?? null}
            oauthDetail={params.detail ?? null}
          />
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Belum punya license key?{" "}
          <a href="/#pricing" className="text-primary hover:underline">
            Dapatkan di sini
          </a>
        </p>
      </div>
    </div>
  );
}

