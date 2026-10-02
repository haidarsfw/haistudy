import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AccountFrame } from "@/components/account/account-chrome";
import { PartnerPanel } from "@/components/partner/partner-panel";
import { getOptionalAccount } from "@/lib/auth/account-session";

export const metadata: Metadata = {
  title: "Partner haistudy",
  description: "Status kemitraan, komisi, dan tujuan pembayaran kamu.",
};

/**
 * Halaman partner, terpisah dari /account dengan sengaja.
 *
 * /account menjawab "siapa saya di sini". Halaman ini menjawab "sudah dapat
 * berapa, kapan dibayar": pertanyaan uang, dibuka oleh orang yang berbeda,
 * dengan frekuensi yang berbeda. Menjejalkannya jadi tab ketujuh di /account
 * akan menguburnya di bawah enam hal yang tidak dicari siapa pun hari itu.
 *
 * Rangkanya tetap rangka yang sama supaya terasa satu produk, bukan dua.
 */
export default async function PartnerPage() {
  const account = await getOptionalAccount();
  if (!account) redirect("/login?redirect=/partner");

  return (
    <AccountFrame>
      <PartnerPanel />
    </AccountFrame>
  );
}
