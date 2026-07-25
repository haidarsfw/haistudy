import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MailCheck, MessageCircle, ShieldCheck, User } from "lucide-react";

import { SignOutButton, VerifyEmailBanner } from "@/components/account/account-actions";
import { AccountSection, AccountShell } from "@/components/account/account-shell";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AccountSecurity } from "@/components/account/account-security";
import {
  AccountDeletion,
  AccountLanguage,
  AccountReferralCard,
} from "@/components/account/account-extras";
import { getOptionalAccount } from "@/lib/auth/account-session";
import {
  activeAccesses,
  getAccountReferral,
  listAccountAccesses,
  listAccountPurchases,
} from "@/lib/auth/account-access";
import { listAccountDevices } from "@/lib/auth/account-devices";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { PACKAGE_LABELS, WA_ADMIN, formatIDR } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Akun",
  description: "Atur data diri, lihat aksesmu, dan kelola perangkat.",
  robots: { index: false, follow: false },
};

const NAV = [
  { id: "akses", label: "Akses saya" },
  { id: "data-diri", label: "Data diri" },
  { id: "riwayat", label: "Riwayat" },
  { id: "referral", label: "Referral" },
  { id: "keamanan", label: "Keamanan" },
  { id: "preferensi", label: "Preferensi" },
  { id: "hapus-akun", label: "Hapus akun" },
];

const STATUS = {
  active: { label: "Aktif", className: "border-primary/40 bg-primary/10 text-primary" },
  expired: { label: "Sudah habis", className: "border-border bg-muted text-muted-foreground" },
  suspended: {
    label: "Ditangguhkan",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
} as const;

const PURCHASE_STATUS = {
  pending: { label: "Menunggu konfirmasi", className: "text-warning" },
  approved: { label: "Selesai", className: "text-primary" },
  rejected: { label: "Ditolak", className: "text-destructive" },
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The account page. Not a step in the buying flow — it is the "my stuff" page
 * reached from the profile menu, which is what keeps the purchase path short.
 *
 * Everything is loaded here on the server rather than fetched by the browser:
 * it is one render, several small queries, and no loading spinners on a page
 * that is mostly text.
 */
export default async function AccountPage() {
  const account = await getOptionalAccount();
  if (!account) redirect("/login?redirect=/account");

  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;

  const [accesses, purchases, referral, deviceView] = supabase
    ? await Promise.all([
        listAccountAccesses(supabase, account.id),
        listAccountPurchases(supabase, account.id),
        getAccountReferral(supabase, account.id),
        listAccountDevices(supabase, account.id),
      ])
    : [[], [], null, { devices: [], slots: [] }];

  const live = activeAccesses(accesses);
  // Never the email's local part. Someone who has not filled in a name yet
  // gets a neutral heading instead of being greeted as "akunfotoalkhalifah".
  const displayName = account.nickname || account.fullName || "";
  const waHref = `https://api.whatsapp.com/send?phone=${WA_ADMIN}&text=${encodeURIComponent(
    `Halo admin, saya${displayName ? ` ${displayName}` : ""} (${account.email}) butuh bantuan soal akun saya.`
  )}`;

  return (
    <AccountShell items={NAV}>
      {/* Identity strip. Deliberately above the contents list rather than in
          it: it is who you are, not a section you navigate to. */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {account.avatarUrl ? (
              <Image
                src={account.avatarUrl}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <User className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground lg:text-2xl">
              {displayName || "Akun kamu"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{account.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {account.authProvider === "google" ? "Masuk lewat Google" : "Email dan password"}
              </span>
              {account.emailVerifiedAt && (
                <span className="inline-flex items-center gap-1.5 text-primary">
                  <MailCheck className="h-3.5 w-3.5" />
                  Email terkonfirmasi
                </span>
              )}
              <span>Bergabung {formatDate(account.createdAt)}</span>
            </div>
          </div>
        </div>
        <SignOutButton />
      </header>

      {!account.emailVerifiedAt && <VerifyEmailBanner email={account.email} />}

      <AccountSection
        id="akses"
        title="Akses saya"
        description="Setiap periode ujian yang kamu beli menempel di akun ini."
      >
        {accesses.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-foreground">Kamu belum punya akses</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Akunmu sudah jadi. Tinggal pilih paket untuk periode ujian yang kamu mau.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/#harga"
                className="brand-gradient-bg inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
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
          <ul className="flex flex-col gap-2.5">
            {accesses.map((a) => {
              const s = STATUS[a.status];
              return (
                <li
                  key={a.licenseKey}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold uppercase text-foreground">
                        {a.scopeKey.replace(/-/g, " ")}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.className}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PACKAGE_LABELS[a.packageTier]}
                      {a.status === "active" && a.daysLeft !== null && (
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
      </AccountSection>

      <AccountSection
        id="data-diri"
        title="Data diri"
        description="Diisi sekali di sini, lalu terisi otomatis setiap kamu beli akses."
      >
        <AccountProfileForm
          initial={{
            fullName: account.fullName,
            nickname: account.nickname,
            whatsapp: account.whatsapp,
            campus: account.campus,
            angkatan: account.angkatan,
            avatarUrl: account.avatarUrl,
          }}
        />
      </AccountSection>

      <AccountSection id="riwayat" title="Riwayat pembelian">
        {purchases.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Belum ada pembelian.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {purchases.map((p) => {
              const st = PURCHASE_STATUS[p.status];
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {PACKAGE_LABELS[p.packageId as keyof typeof PACKAGE_LABELS] ??
                        p.packageId}
                      <span className="text-muted-foreground"> · </span>
                      <span className="uppercase text-muted-foreground">
                        {p.scopeKey.replace(/-/g, " ")}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(p.createdAt)}
                      {p.orderNo !== null && <> · Invoice #{p.orderNo}</>}
                      {p.amount !== null && <> · {formatIDR(p.amount)}</>}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${st.className}`}>
                    {st.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/account/data"
          className="mt-3 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Unduh data saya
        </Link>
      </AccountSection>

      <AccountSection id="referral" title="Referral">
        <AccountReferralCard referral={referral} />
      </AccountSection>

      <AccountSection id="keamanan" title="Keamanan">
        <AccountSecurity
          authProvider={account.authProvider}
          devices={deviceView.devices}
          slots={deviceView.slots}
        />
      </AccountSection>

      <AccountSection id="preferensi" title="Preferensi">
        <AccountLanguage initial={account.language} />
      </AccountSection>

      <AccountSection id="hapus-akun" title="Hapus akun">
        <AccountDeletion hasActiveAccess={live.length > 0} whatsappHref={waHref} />
      </AccountSection>

      {/* Below the deletion block on purpose: it is the last thing on the page,
          and someone who got this far and hesitated should find a human before
          they find the button. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Ada masalah dengan akunmu?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Chat admin langsung, biasanya dibalas di hari yang sama.
          </p>
        </div>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </AccountShell>
  );
}
