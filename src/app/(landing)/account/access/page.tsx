import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AccountPane } from "@/components/account/account-chrome";
import { EnterAccessButton } from "@/components/account/enter-access-button";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { listAccountAccesses } from "@/lib/auth/account-access";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { PACKAGE_LABELS } from "@/lib/payments";
import { ACCESS_STATUS, scopeLabel } from "@/lib/account/labels";

export const metadata: Metadata = {
  title: "Akses saya",
  robots: { index: false, follow: false },
};

export default async function AccountAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ enter?: string }>;
}) {
  const account = await getOptionalAccount();
  if (!account) return null;

  const params = await searchParams;
  // Set by sign-in when it tried to open the only access and found an
  // unrecognised browser. The confirmation opens on arrival.
  const autoEnterKey = params.enter ?? "";

  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;
  const accesses = supabase ? await listAccountAccesses(supabase, account.id) : [];

  return (
    <AccountPane
      current="/account/access"
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
            const s = ACCESS_STATUS[a.status];
            return (
              <li
                key={a.licenseKey}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {scopeLabel(a.scopeKey)}
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
                {/* Not a plain link: opening an access sets the app cookies and
                    may need to spend a device slot, which the user has to see
                    before it happens. */}
                {a.status === "active" && (
                  <EnterAccessButton
                    licenseKey={a.licenseKey}
                    autoEnter={autoEnterKey === a.licenseKey}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AccountPane>
  );
}
