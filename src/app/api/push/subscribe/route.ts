import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeColumns, ScopeError } from "@/lib/auth/scope-check";

export const runtime = "nodejs";

interface Body {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
  deviceId?: string;
  replacedEndpoint?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const scope = await requireScope(req);
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("hs-session");
    const licenseKey = sessionCookie?.value;
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const endpoint = body.endpoint;
    const p256dh = body.keys?.p256dh;
    const auth = body.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Missing endpoint or keys" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ skipped: true });
    }
    const supabase = createServerClient()!;

    // If replacing an old endpoint (pushsubscriptionchange), revoke it.
    if (body.replacedEndpoint && body.replacedEndpoint !== endpoint) {
      await supabase
        .from("push_subscriptions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("endpoint", body.replacedEndpoint);
    }

    // Same endpoint may have been bound to a different license_key (account
    // switch on shared device). Detach prior bindings first so the new owner
    // takes over, then upsert.
    await supabase
      .from("push_subscriptions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("endpoint", endpoint)
      .neq("license_key", licenseKey);

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        license_key: licenseKey,
        endpoint,
        p256dh,
        auth,
        user_agent: body.userAgent ?? req.headers.get("user-agent"),
        device_id: body.deviceId ?? null,
        last_used_at: new Date().toISOString(),
        revoked_at: null,
        ...scopeColumns(scope),
      },
      { onConflict: "license_key,endpoint" }
    );

    if (error) {
      console.error("[push.subscribe]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ScopeError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[push.subscribe] exception", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
