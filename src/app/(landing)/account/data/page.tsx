import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/components/account/print-button";
import { Wordmark } from "@/components/landing/logo";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { listAccountAccesses, listAccountPurchases } from "@/lib/auth/account-access";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { PACKAGE_LABELS, formatIDR } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Data akun",
  robots: { index: false, follow: false },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-foreground">{value || "-"}</dd>
    </div>
  );
}

/**
 * Everything haistudy holds about this account, on one page you can read.
 *
 * A printable summary rather than a JSON download: a file full of snake_case
 * keys answers the legal obligation but not the actual question, which is
 * "what do you know about me". The browser's own print dialog turns this into
 * a PDF, so there is no export job, no queue, and no storage.
 *
 * Password hashes and session tokens are not here and never will be. Nothing
 * on this page is anything the account holder did not give us.
 */
export default async function AccountDataPage() {
  const account = await getOptionalAccount();
  if (!account) redirect("/login?redirect=/account/data");

  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;
  const [accesses, purchases] = supabase
    ? await Promise.all([
        listAccountAccesses(supabase, account.id),
        listAccountPurchases(supabase, account.id),
      ])
    : [[], []];

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke akun
        </Link>
        <PrintButton />
      </div>

      <div className="mt-8">
        <Wordmark className="text-sm" />
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
          Data akun
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dicetak {formatDateTime(new Date().toISOString())}
        </p>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-sm font-bold text-foreground">Identitas</h2>
        <dl className="mt-2">
          <Row label="Email" value={account.email} />
          <Row
            label="Cara masuk"
            value={account.authProvider === "google" ? "Google" : "Email dan password"}
          />
          <Row
            label="Email terkonfirmasi"
            value={account.emailVerifiedAt ? formatDateTime(account.emailVerifiedAt) : "Belum"}
          />
          <Row label="Nama lengkap" value={account.fullName} />
          <Row label="Panggilan" value={account.nickname} />
          <Row label="WhatsApp" value={account.whatsapp} />
          <Row label="Kampus" value={account.campus} />
          <Row label="Angkatan" value={account.angkatan} />
          <Row label="Bahasa" value={account.language === "en" ? "English" : "Indonesia"} />
          <Row label="Bergabung" value={formatDateTime(account.createdAt)} />
          <Row label="Terakhir masuk" value={formatDateTime(account.lastLoginAt)} />
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-sm font-bold text-foreground">Akses</h2>
        {accesses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada akses.</p>
        ) : (
          <dl className="mt-2">
            {accesses.map((a) => (
              <Row
                key={a.licenseKey}
                label={a.scopeKey.replace(/-/g, " ").toUpperCase()}
                value={`${PACKAGE_LABELS[a.packageTier]} · ${
                  a.status === "active" ? "aktif" : a.status === "expired" ? "habis" : "ditangguhkan"
                }${a.expiry ? ` · berlaku sampai ${formatDateTime(a.expiry)}` : ""}`}
              />
            ))}
          </dl>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-sm font-bold text-foreground">Pembelian</h2>
        {purchases.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada pembelian.</p>
        ) : (
          <dl className="mt-2">
            {purchases.map((p) => (
              <Row
                key={p.id}
                label={formatDateTime(p.createdAt)}
                value={`${
                  PACKAGE_LABELS[p.packageId as keyof typeof PACKAGE_LABELS] ?? p.packageId
                } · ${p.scopeKey.replace(/-/g, " ").toUpperCase()} · ${p.status}${
                  p.orderNo !== null ? ` · invoice #${p.orderNo}` : ""
                }${p.amount !== null ? ` · ${formatIDR(p.amount)}` : ""}`}
              />
            ))}
          </dl>
        )}
      </section>

      <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
        Halaman ini tidak memuat password atau token sesi. Kalau kamu mau datamu dihapus,
        ada tombolnya di zona bahaya halaman Akun.
      </p>
    </div>
  );
}
