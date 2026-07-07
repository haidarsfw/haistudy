import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  resolveSupportSender,
  rateLimit,
  broadcastTyping,
} from "@/lib/support/server";
import { SUPPORT_TYPING_DEBOUNCE_MS } from "@/lib/constants";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";

/**
 * POST /api/support/typing  { licenseKey }
 * Server-trusted typing broadcast on channel `support:typing:<licenseKey>`.
 * Rate-limited to 1 broadcast per SUPPORT_TYPING_DEBOUNCE_MS per sender.
 */
export async function POST(req: NextRequest) {
  try {
    const scope = await requireScope(req);
    const body = await req.json();
    const licenseKey = String(body?.licenseKey ?? "");
    if (!licenseKey) {
      return NextResponse.json({ error: "Missing licenseKey" }, { status: 400 });
    }

    const sender = await resolveSupportSender();
    if (!sender.licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Permission: admin OR conversation owner only
    if (!sender.isAdmin && sender.licenseKey !== licenseKey) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      !rateLimit(
        `support:typing:${sender.licenseKey}:${licenseKey}`,
        SUPPORT_TYPING_DEBOUNCE_MS,
        1
      )
    ) {
      // Silently swallow rapid repeats - not an error
      return NextResponse.json({ success: true, throttled: true });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true, configured: false });
    }

    const supabase = createServerClient()!;
    await broadcastTyping(supabase, scope, licenseKey, {
      kind: sender.isAdmin ? "admin" : "user",
      name: sender.name ?? sender.licenseKey.slice(0, 8),
      startedAt: new Date().toISOString(),
      senderKey: sender.licenseKey,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
