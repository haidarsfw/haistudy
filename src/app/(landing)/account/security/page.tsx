import type { Metadata } from "next";

import { AccountPane } from "@/components/account/account-chrome";
import { AccountSecurity } from "@/components/account/account-security";
import { getOptionalAccount } from "@/lib/auth/account-session";

export const metadata: Metadata = {
  title: "Keamanan",
  robots: { index: false, follow: false },
};

export default async function AccountSecurityPage() {
  const account = await getOptionalAccount();
  if (!account) return null;

  return (
    <AccountPane current="/account/security" title="Keamanan">
      <AccountSecurity authProvider={account.authProvider} />
    </AccountPane>
  );
}
