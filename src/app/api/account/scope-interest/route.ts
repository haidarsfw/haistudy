import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { parseScopeKey, isAvailableScope, isPurchasableScope } from "@/lib/scope";

const PACKAGES = new Set(["share", "normal", "vip", "diamond"]);

/**
 * "Kabari saya kalau periode ini sudah bisa dibeli."
 *
 * A cohort now lands on its own exam period even when that period is still
 * being written, which is honest but ends the conversation. This records who
 * was standing at that wall so they can be told when it opens.
 *
 * scope-exempt: the caller is asking about a period they do NOT have access to,
 * so requireScope would refuse by design. Identity comes from the account
 * cookie and the scope is validated against the registry instead.
 */
export async function POST(req: Request) {
  try {
    const account = await requireAccount();

    const body = (await req.json().catch(() => ({}))) as {
      scope?: string;
      package?: string;
    };

    const scope = parseScopeKey(String(body.scope ?? ""));
    // Not in the registry, or hidden, means nobody should know it exists.
    if (!scope || !isAvailableScope(scope)) {
      return NextResponse.json({ error: "Periode tidak dikenal" }, { status: 400 });
    }
    // Already on sale — there is nothing to wait for, and recording it would
    // put someone on a list that never gets sent.
    if (isPurchasableScope(scope)) {
      return NextResponse.json({ ok: true, alreadyOpen: true });
    }

    const pkg = PACKAGES.has(String(body.package)) ? String(body.package) : null;

    if (!isSupabaseServerConfigured) return NextResponse.json({ ok: true });
    const supabase = createServerClient()!;

    // Idempotent: the unique constraint turns a second tap into a no-op rather
    // than a duplicate row or an error the buyer has to read.
    const { error } = await supabase.from("scope_interest").upsert(
      {
        account_id: account.id,
        semester: scope.semester,
        exam_period: scope.examPeriod,
        jurusan: scope.jurusan,
        package: pkg,
      },
      { onConflict: "account_id,semester,exam_period,jurusan", ignoreDuplicates: true }
    );

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
