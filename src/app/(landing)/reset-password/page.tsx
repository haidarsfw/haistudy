import type { Metadata } from "next";

import { AuthShell } from "@/components/account/auth-shell";
import { ResetPasswordForm } from "@/components/account/reset-password-form";

export const metadata: Metadata = {
  title: "Password baru",
  description: "Buat password baru untuk akun haistudy kamu.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Buat password baru"
      subtitle="Setelah ini kamu langsung masuk, tidak perlu mengetik ulang."
      backHref="/login"
      backLabel="Kembali ke masuk"
    >
      <ResetPasswordForm token={token ?? ""} />
    </AuthShell>
  );
}
