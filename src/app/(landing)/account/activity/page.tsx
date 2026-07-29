import type { Metadata } from "next";

import { AccountPane } from "@/components/account/account-chrome";
import { AccountReferralCard } from "@/components/account/account-extras";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { getAccountReferral, listAccountPurchases } from "@/lib/auth/account-access";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { PACKAGE_LABELS, formatIDR } from "@/lib/payments";
import { PURCHASE_STATUS, formatDate, scopeLabel } from "@/lib/account/labels";

export const metadata: Metadata = {
  title: "Riwayat & referral",
  robots: { index: false, follow: false },
};

/**
 * What you have bought, and who you have brought.
 *
 * One page because both are a record of things that already happened, and
 * neither is long enough on its own to be worth a tap of its own.
 */
export default async function AccountActivityPage() {
  const account = await getOptionalAccount();
  if (!account) return null;

  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;
  const [purchases, referral] = supabase
    ? await Promise.all([
        listAccountPurchases(supabase, account.id),
        getAccountReferral(supabase, account.id),
      ])
    : [[], null];

  return (
    <AccountPane current="/account/activity" title="Riwayat & referral">
      <div className="space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-foreground">Riwayat pembelian</h3>
          <div className="mt-3">
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
                          <span className="text-muted-foreground">
                            {scopeLabel(p.scopeKey)}
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
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Referral</h3>
          <div className="mt-3">
            <AccountReferralCard referral={referral} />
          </div>
        </section>
      </div>
    </AccountPane>
  );
}
