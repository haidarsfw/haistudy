import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { AccountPane } from "@/components/account/account-chrome";
import { AccountDeletion } from "@/components/account/account-extras";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { WA_ADMIN } from "@/lib/payments";
import { supportHref } from "@/lib/account/labels";

export const metadata: Metadata = {
  title: "Kelola akun",
  robots: { index: false, follow: false },
};

/**
 * The two things you do TO an account rather than with it.
 *
 * On its own route, deliberately. Deletion sat at the bottom of a long scroll
 * before, which meant it could be reached by momentum — the one control on the
 * site where arriving by accident matters.
 */
export default async function AccountManagePage() {
  const account = await getOptionalAccount();
  if (!account) return null;

  const displayName = account.nickname || account.fullName || "";
  const waHref = supportHref(WA_ADMIN, displayName, account.email);

  return (
    <AccountPane current="/account/manage" title="Kelola akun">
      {/* One flat list, no section headings. Each card now says its own name in
          its header, so a heading above it printed "Hapus akun" twice. */}
      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Unduh data saya</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Semua yang kami simpan tentang akunmu, dalam satu halaman yang bisa kamu
            simpan atau cetak.
          </p>
          <Link
            href="/account/data"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Buka data saya
          </Link>
        </section>

        <AccountDeletion
          email={account.email}
          scheduledAt={account.deletionRequestedAt}
          whatsappHref={waHref}
        />
      </div>
    </AccountPane>
  );
}
