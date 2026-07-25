import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PaymentsFlow } from "@/components/payments/payments-flow";
import { getOptionalAccount } from "@/lib/auth/account-session";

export const metadata: Metadata = {
  title: "Beli Akses",
  description:
    "Pilih paket dan selesaikan pembayaran. Aksesnya menempel di akun haistudy kamu, jadi periode berikutnya tinggal masuk dan beli lagi.",
  alternates: { canonical: "/payments" },
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ pkg?: string }>;
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

  return (
    <div className="min-h-screen bg-background">
      <PaymentsFlow
        initialPkg={params.pkg}
        account={{
          email: account.email,
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
