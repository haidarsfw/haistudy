import { redirect } from "next/navigation";

import { AccountFrame, AccountIdentity } from "@/components/account/account-chrome";
import { DeletionScheduled } from "@/components/account/account-extras";
import { VerifyEmailBanner } from "@/components/account/verify-email-notice";
import { getOptionalAccount } from "@/lib/auth/account-session";

/**
 * Everything under /account shares one frame: the sign-in guard, the identity
 * strip, and the unconfirmed-email reminder.
 *
 * Guarding here rather than in each page means a new sub-route cannot be added
 * without a guard by forgetting to add one. The session read is deduped for the
 * request, so this costs nothing on top of what the page itself already needs.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getOptionalAccount();
  if (!account) redirect("/login?redirect=/account");

  return (
    <AccountFrame>
      <div className="mt-8 flex flex-col gap-6">
        <AccountIdentity
          displayName={account.nickname || account.fullName || ""}
          email={account.email}
          avatarUrl={account.avatarUrl}
          authProvider={account.authProvider}
          emailVerified={Boolean(account.emailVerifiedAt)}
          createdAt={account.createdAt}
        />

        {/* A pending deletion outranks everything else on the page, so it sits
            above it. Shown on every account page, not just the one where it was
            started — a countdown you can only see by going looking for it is
            not a warning. */}
        {account.deletionRequestedAt && (
          <DeletionScheduled scheduledAt={account.deletionRequestedAt} />
        )}

        {/* On every account page too. It is the one thing that can hold up an
            order, so it should not be possible to be deep in the settings and
            not know about it. */}
        {!account.emailVerifiedAt && <VerifyEmailBanner email={account.email} />}

        {children}
      </div>
    </AccountFrame>
  );
}
