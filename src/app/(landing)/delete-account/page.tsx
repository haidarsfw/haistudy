import type { Metadata } from "next";

import { DeleteConfirm } from "@/components/account/delete-confirm";

export const metadata: Metadata = {
  title: "Konfirmasi penghapusan akun",
  robots: { index: false, follow: false },
};

/**
 * Reached from the confirmation e-mail.
 *
 * Public on purpose: people read mail on a phone and browse on a laptop, so a
 * link that first demands a sign-in is a link that quietly never gets clicked.
 * The token is the authority here, not a session.
 */
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <DeleteConfirm token={token ?? ""} />;
}
