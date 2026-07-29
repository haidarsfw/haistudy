import type { Metadata } from "next";

import { AccountPane } from "@/components/account/account-chrome";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { getOptionalAccount } from "@/lib/auth/account-session";

export const metadata: Metadata = {
  title: "Data diri",
  robots: { index: false, follow: false },
};

export default async function AccountProfilePage() {
  const account = await getOptionalAccount();
  if (!account) return null;

  return (
    <AccountPane
      current="/account/profile"
      title="Data diri"
      description="Diisi sekali di sini, lalu terisi otomatis setiap kamu beli akses."
    >
      <AccountProfileForm
        initial={{
          fullName: account.fullName,
          nickname: account.nickname,
          whatsapp: account.whatsapp,
          campus: account.campus,
          angkatan: account.angkatan,
          avatarUrl: account.avatarUrl,
        }}
        nicknameChangesLeft={account.nicknameChangesLeft}
      />
    </AccountPane>
  );
}
