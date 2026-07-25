import type { Metadata } from "next";

import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { LegacyKeyForm } from "@/components/auth/legacy-key-form";

export const metadata: Metadata = {
  title: "Masuk",
  description:
    "Masuk ke akun haistudy kamu untuk membuka akses materi, latihan soal, dan komunitas belajar.",
  alternates: { canonical: "/login" },
};

function safePath(value?: string): string | undefined {
  // Same-origin paths only. Anything else here would be an open redirect.
  if (!value) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    oauth_error?: string;
    email?: string;
    detail?: string;
    next?: string;
    redirect?: string;
    legacy?: string;
  }>;
}) {
  const params = await searchParams;

  // `next` is set by us (checkout intent); `redirect` is set by the proxy when
  // it bounces someone off a page they were not signed in for. Both mean the
  // same thing here.
  const next = safePath(params.next) ?? safePath(params.redirect);

  // Unlinked escape hatch. See legacy-key-form.tsx for why it still exists.
  if (params.legacy === "1") {
    return (
      <AuthShell
        title="Masuk dengan license key"
        subtitle="Jalur lama. Kalau kamu punya akun, masuk lewat halaman biasa."
        backHref="/login"
        backLabel="Masuk biasa"
      >
        <LegacyKeyForm />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Masuk ke akunmu"
      subtitle="Satu akun untuk semua periode ujian yang kamu beli."
    >
      <LoginForm
        oauthError={params.oauth_error ?? null}
        oauthEmail={params.email ?? null}
        oauthDetail={params.detail ?? null}
        next={next ?? null}
      />
    </AuthShell>
  );
}
