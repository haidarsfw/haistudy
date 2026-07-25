import type { Metadata } from "next";

import { AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";

export const metadata: Metadata = {
  title: "Lupa password",
  description: "Minta tautan untuk membuat password baru akun haistudy kamu.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Lupa password"
      subtitle="Masukkan emailmu, nanti kami kirim tautan untuk membuat password baru."
      backHref="/login"
      backLabel="Kembali ke masuk"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
