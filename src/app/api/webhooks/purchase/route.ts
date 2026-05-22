import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { scopeColumns } from "@/lib/auth/scope-check";
import { DEFAULT_SCOPE, isAvailableScope, parseScopeKey } from "@/lib/scope";

// ─── POST /api/webhooks/purchase - Google Form webhook ───
// Expected payload from Google Apps Script:
// { name, whatsapp, email?, package, scope? }
// `scope` (optional): "s2-uas-bm" etc. Defaults to DEFAULT_SCOPE if absent.
// Caller must send header `X-Webhook-Secret: $PURCHASE_WEBHOOK_SECRET`.
// TODO(google-script): forward the scope picked by the user from the order form.
const ALLOWED_PACKAGES = new Set(["share", "normal", "vip", "diamond"]);

export async function POST(request: Request) {
  try {
    // Verify webhook signature (secure default: 401 if secret env missing)
    const signature = request.headers.get("x-webhook-secret");
    if (
      !process.env.PURCHASE_WEBHOOK_SECRET ||
      signature !== process.env.PURCHASE_WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, whatsapp, email } = body;
    const pkg = body.package || "normal";

    // Resolve scope from body; fallback to DEFAULT_SCOPE for legacy callers.
    let scope = DEFAULT_SCOPE;
    if (typeof body.scope === "string" && body.scope.length > 0) {
      const parsed = parseScopeKey(body.scope);
      if (!parsed || !isAvailableScope(parsed)) {
        return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
      }
      scope = parsed;
    }

    if (!name || !whatsapp) {
      return NextResponse.json(
        { error: "name and whatsapp are required" },
        { status: 400 }
      );
    }

    // Shape + length validation
    if (
      typeof name !== "string" ||
      typeof whatsapp !== "string" ||
      name.trim().length === 0 ||
      whatsapp.trim().length === 0 ||
      name.length > 100 ||
      whatsapp.length > 30 ||
      (email !== undefined && email !== null && (typeof email !== "string" || email.length > 100)) ||
      !ALLOWED_PACKAGES.has(pkg)
    ) {
      return NextResponse.json(
        { error: "Invalid field shape" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      // No-op in dev mode - purchases are seeded in /api/admin/purchase
      return NextResponse.json({
        success: true,
        id: crypto.randomUUID(),
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("purchase_requests")
      .insert({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        email: email?.trim() || null,
        package: pkg,
        status: "pending",
        ...scopeColumns(scope),
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Purchase webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
