import type { Metadata } from "next";

import { DeleteCancel } from "@/components/account/delete-confirm";

export const metadata: Metadata = {
  title: "Batalkan penghapusan akun",
  robots: { index: false, follow: false },
};

/** Reached from the "dijadwalkan dihapus" e-mail. Public, same reason. */
export default async function CancelDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <DeleteCancel token={token ?? ""} />;
}
