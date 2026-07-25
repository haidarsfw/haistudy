import { NextResponse } from "next/server";

import { getOptionalAccount } from "@/lib/auth/account-session";

/**
 * Who is signed in, at the account layer.
 *
 * Answers 200 with `account: null` rather than 401 when signed out: the header
 * calls this on every landing page load, and a 401 in the console on a normal
 * anonymous visit is noise that hides real failures.
 */
export async function GET() {
  // scope-exempt: returns the caller's own account row. No scoped table is read.
  const account = await getOptionalAccount();

  if (!account) {
    return NextResponse.json({ account: null }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      account: {
        id: account.id,
        email: account.email,
        authProvider: account.authProvider,
        emailVerified: Boolean(account.emailVerifiedAt),
        fullName: account.fullName,
        nickname: account.nickname,
        whatsapp: account.whatsapp,
        campus: account.campus,
        classCode: account.classCode,
        avatarUrl: account.avatarUrl,
        language: account.language,
        createdAt: account.createdAt,
        deletionRequested: Boolean(account.deletionRequestedAt),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
