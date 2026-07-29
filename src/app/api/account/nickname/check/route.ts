import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";
import {
  NICKNAME_MAX,
  normalizeNickname,
  suggestNicknames,
  validateNickname,
} from "@/lib/account/nickname";
import { checkNicknameQuota, recordNicknameCheck } from "@/lib/auth/account-rate-limit";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

/**
 * Is this nickname free?
 *
 * Answered while they type, not when they press the button. A name being taken
 * is the one validation failure a person cannot predict, and finding out about
 * it at the end of a checkout — after the payment details are already filled
 * in — is the worst possible moment to be sent back to the first step.
 *
 * Unlike the referral-code checker this one says plainly which answer it is.
 * A nickname is public: it is printed next to every message in the class chat,
 * so "is this taken" is not information anyone has to be protected from.
 *
 * `available: null` means we could not answer — offline, rate limited, server
 * down. The caller must treat that as "carry on", never as "taken".
 */
export async function GET(req: Request) {
  // scope-exempt: account layer only. A nickname belongs to the person, not to
  // any exam period, and is the same string in every scope they buy.
  try {
    const account = await requireAccount();

    const url = new URL(req.url);
    const raw = (url.searchParams.get("value") ?? "").slice(0, NICKNAME_MAX * 2);
    const value = normalizeNickname(raw);

    const problem = validateNickname(value);
    if (problem) {
      return NextResponse.json({ available: false, reason: problem, suggestions: [] });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ available: null, suggestions: [] });
    }
    const supabase = createServerClient()!;

    const ip = getClientIp(req);
    const quota = await checkNicknameQuota(supabase, account.id);
    if (!quota.allowed) {
      // Deliberately `null`, not `false`. Our own limiter must never be the
      // reason someone is told a perfectly good name is unavailable.
      return NextResponse.json(
        { available: null, suggestions: [] },
        { status: 429, headers: { "Retry-After": String(quota.retryAfter) } }
      );
    }
    await recordNicknameCheck(supabase, account.id, ip);

    // Case-insensitive, and never against themselves — re-saving your own
    // profile without touching the name must not report a clash with you.
    const { data: clash } = await supabase
      .from("accounts")
      .select("id")
      .ilike("nickname", value)
      .neq("id", account.id)
      .limit(1)
      .maybeSingle();

    if (!clash) {
      return NextResponse.json({ available: true, value, suggestions: [] });
    }

    // Offer only names that are genuinely free. Suggesting something that is
    // also taken turns one rejection into two.
    const candidates = suggestNicknames(value, account.fullName);
    let free: string[] = [];
    if (candidates.length) {
      const { data: takenRows } = await supabase
        .from("accounts")
        .select("nickname")
        .in("nickname", candidates);
      const taken = new Set(
        (takenRows ?? []).map((r) => String(r.nickname ?? "").toLowerCase())
      );
      free = candidates.filter((c) => !taken.has(c.toLowerCase())).slice(0, 3);
    }

    return NextResponse.json({
      available: false,
      // With no digits allowed there is no counter to fall back on, so when
      // their full name has nothing left to give the message has to ask for
      // it rather than inventing something on their behalf.
      reason: free.length
        ? "Nama panggilan ini sudah dipakai orang lain"
        : "Nama panggilan ini sudah dipakai. Coba tambahkan nama belakangmu.",
      suggestions: free,
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/nickname/check] error", error);
    return NextResponse.json({ available: null, suggestions: [] }, { status: 500 });
  }
}
