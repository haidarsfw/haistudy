import { NextResponse } from "next/server";

import { getOptionalAccount } from "@/lib/auth/account-session";
import { activeAccesses, listAccountAccesses } from "@/lib/auth/account-access";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

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

  // The header needs to know whether there is anything to open, so it can say
  // "Dashboard" instead of "Beli Akses". One extra query, and only for someone
  // who is already signed in.
  const accesses = isSupabaseServerConfigured
    ? await listAccountAccesses(createServerClient()!, account.id)
    : [];
  const live = activeAccesses(accesses);

  return NextResponse.json(
    {
      access: {
        hasActive: live.length > 0,
        count: live.length,
        dashboardPath:
          live.length > 0
            ? `/s${live[0].scope.semester}/${live[0].scope.examPeriod}/${live[0].scope.jurusan}/dashboard`
            : null,
      },
      account: {
        id: account.id,
        email: account.email,
        authProvider: account.authProvider,
        emailVerified: Boolean(account.emailVerifiedAt),
        fullName: account.fullName,
        nickname: account.nickname,
        whatsapp: account.whatsapp,
        campus: account.campus,
        angkatan: account.angkatan,
        // Last class used at checkout. Sent so /payments can prefill it; the
        // account page never edits it.
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
