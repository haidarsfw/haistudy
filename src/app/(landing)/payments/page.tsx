import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PaymentsFlow } from "@/components/payments/payments-flow";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { availableDiscounts } from "@/lib/referral/rewards";
import { listClassPromos } from "@/lib/referral/class-discount";
import { PACKAGE_PRICES } from "@/lib/payments";

// The cheapest thing anyone can buy. A discount is capped at the price, and the
// price is not known until a package is picked, so it is measured against this
// floor here and re-priced inside the flow.
//
// Was 20000, the old LE86 Share price. That promo is gone (migration 071), so
// Share's list price is the floor for everyone.
const MIN_PACKAGE_PRICE = PACKAGE_PRICES.share;

export const metadata: Metadata = {
  title: "Beli Akses",
  description:
    "Pilih paket dan selesaikan pembayaran. Aksesnya menempel di akun haistudy kamu, jadi periode berikutnya tinggal masuk dan beli lagi.",
  alternates: { canonical: "/payments" },
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ pkg?: string; welcome?: string }>;
}) {
  const params = await searchParams;

  /**
   * Checkout requires an account.
   *
   * Not gatekeeping for its own sake: the access has to land on something, and
   * that something is the account rather than a fresh identity minted per
   * purchase. The chosen package rides along in the redirect so the visitor
   * comes back to what they clicked instead of the homepage — losing your
   * place is the thing that makes people abandon a checkout.
   */
  const account = await getOptionalAccount();
  if (!account) {
    const next = params.pkg ? `/payments?pkg=${encodeURIComponent(params.pkg)}` : "/payments";
    redirect(`/register?next=${encodeURIComponent(next)}`);
  }

  // Read here so the price on screen matches the price the server will charge.
  // The server recomputes it when the order is submitted — this copy exists to
  // be shown, and is never trusted.
  //
  // Priced against the cheapest package so the figure is available before a
  // package is chosen; the flow re-caps it against whatever they pick.
  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;
  const [discounts, classPromos] = supabase
    ? await Promise.all([
        availableDiscounts(supabase, account, MIN_PACKAGE_PRICE),
        // Handed over whole rather than resolved here: whether a class promo
        // applies depends on the class the buyer is about to type and the
        // package they are about to pick, neither of which exists yet.
        listClassPromos(supabase),
      ])
    : [{ best: null, others: [] }, []];

  return (
    <div className="min-h-screen bg-background">
      <PaymentsFlow
        initialPkg={params.pkg}
        justRegistered={params.welcome === "1"}
        discount={discounts.best}
        otherDiscounts={discounts.others}
        classPromos={classPromos}
        account={{
          email: account.email,
          emailVerified: Boolean(account.emailVerifiedAt),
          authProvider: account.authProvider,
          fullName: account.fullName,
          nickname: account.nickname,
          whatsapp: account.whatsapp,
          campus: account.campus,
          angkatan: account.angkatan,
          classCode: account.classCode,
        }}
      />
    </div>
  );
}
