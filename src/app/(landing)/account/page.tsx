import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { SignOutButton, VerifyEmailBanner } from "@/components/account/account-actions";
import { Wordmark } from "@/components/landing/logo";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { listAccountAccesses } from "@/lib/auth/account-access";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { PACKAGE_LABELS } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Akun",
  description: "Atur data diri, lihat aksesmu, dan kelola perangkat.",
  robots: { index: false, follow: false },
};

const STATUS_COPY = {
  active: { label: "Aktif", className: "border-primary/40 bg-primary/10 text-primary" },
  expired: {
    label: "Sudah habis",
    className: "border-border bg-muted text-muted-foreground",
  },
  suspended: {
    label: "Ditangguhkan",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
} as const;

/**
 * The account page.
 *
 * Not a step in the buying flow — it is the "my stuff" page reached from the
 * profile menu. Stage 1 ships the frame and the two things that must work the
 * day sign-in does: seeing who you are, and getting back out. Data diri,
 * riwayat, referral, perangkat and the danger zone land in stage 2.
 */
export default async function AccountPage() {
  const account = await getOptionalAccount();
  if (!account) redirect("/login?redirect=/account");

  const accesses = isSupabaseServerConfigured
    ? await listAccountAccesses(createServerClient()!, account.id)
    : [];

  const displayName = account.nickname || account.fullName || account.email.split("@")[0];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 lg:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <Wordmark className="text-base" />
      </Link>

      <header className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Halo, {displayName}
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{account.email}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Masuk lewat{" "}
            {account.authProvider === "google" ? "Google" : "email dan password"}
          </p>
        </div>
        <SignOutButton />
      </header>

      {!account.emailVerifiedAt && (
        <div className="mt-6">
          <VerifyEmailBanner email={account.email} />
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-display text-sm font-bold text-foreground">Akses saya</h2>

        {accesses.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-foreground">
              Kamu belum punya akses
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Akunmu sudah jadi. Tinggal pilih paket untuk periode ujian yang kamu mau,
              dan aksesnya nanti menempel di akun ini.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/#harga"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Beli akses
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/preview"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Coba gratis dulu
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {accesses.map((a) => {
              const status = STATUS_COPY[a.status];
              return (
                <li
                  key={a.licenseKey}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold uppercase text-foreground">
                        {a.scopeKey.replace(/-/g, " ")}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PACKAGE_LABELS[a.packageTier]}
                      {a.daysLeft !== null && a.status === "active" && (
                        <> · sisa {a.daysLeft} hari</>
                      )}
                      {!a.activated && <> · belum pernah dibuka</>}
                    </p>
                  </div>

                  {a.status === "active" && (
                    <Link
                      href={`/s${a.scope.semester}/${a.scope.examPeriod}/${a.scope.jurusan}/dashboard`}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Masuk
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs leading-relaxed text-muted-foreground/80">
        Data diri, riwayat pembelian, kode referral, dan pengaturan perangkat menyusul di
        halaman ini.
      </p>
    </div>
  );
}
