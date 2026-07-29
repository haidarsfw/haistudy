import type { Metadata } from "next";

import { AccountPane } from "@/components/account/account-chrome";
import { AccountDevices } from "@/components/account/account-security";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { listAccountDevices } from "@/lib/auth/account-devices";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Perangkat",
  robots: { index: false, follow: false },
};

export default async function AccountDevicesPage() {
  const account = await getOptionalAccount();
  if (!account) return null;

  const supabase = isSupabaseServerConfigured ? createServerClient()! : null;
  const view = supabase
    ? await listAccountDevices(supabase, account.id)
    : { devices: [], slots: [] };

  return (
    <AccountPane
      current="/account/devices"
      title="Perangkat"
      description="Jatah perangkat mengikuti paket yang kamu beli. Keluarkan yang sudah tidak kamu pakai."
    >
      <AccountDevices devices={view.devices} slots={view.slots} />
    </AccountPane>
  );
}
