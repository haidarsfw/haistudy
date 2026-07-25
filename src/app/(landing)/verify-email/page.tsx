import type { Metadata } from "next";

import { AuthShell } from "@/components/account/auth-shell";
import { VerifyEmailClient } from "@/components/account/verify-email-client";

export const metadata: Metadata = {
  title: "Konfirmasi email",
  description: "Konfirmasi alamat email akun haistudy kamu.",
  alternates: { canonical: "/verify-email" },
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell title="Konfirmasi email" backHref="/account" backLabel="Ke akunku">
      <VerifyEmailClient token={token ?? ""} />
    </AuthShell>
  );
}
