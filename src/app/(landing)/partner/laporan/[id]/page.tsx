import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { AccountFrame } from "@/components/account/account-chrome";
import { GroupReport } from "@/components/mentor/group-report";
import { getOptionalAccount } from "@/lib/auth/account-session";

export const metadata: Metadata = {
  title: "Laporan program · Partner haistudy",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A mentor's program report for one group, on its own page so it prints
 * cleanly. Who may read it is decided by the report API (the group's mentor,
 * or the owner); this page only asks for a signed-in account, like /partner.
 */
export default async function GroupReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const account = await getOptionalAccount();
  if (!account) redirect(`/login?redirect=/partner/laporan/${id}`);

  return (
    <AccountFrame>
      <div className="mt-6 print:mt-0">
        <Link
          href="/partner"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline print:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Partner
        </Link>
        <div className="mt-4">
          <GroupReport groupId={id} printable />
        </div>
      </div>
    </AccountFrame>
  );
}
