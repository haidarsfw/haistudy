import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-bold">
              <span className="text-primary">hai</span>study
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk dengan license key
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Belum punya license key?{" "}
          <Link href="/" className="text-primary hover:underline">
            Dapatkan di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
