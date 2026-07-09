import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, scopeColumns, ScopeError } from "@/lib/auth/scope-check";
import { checkCooldown } from "@/lib/auth/cooldown";
import { getCaller } from "@/lib/auth/session-license";
import { isAdminFromSession } from "@/lib/auth/admin-guard";
import { aiConversationLimit, VIP_AI_CONVERSATION_LIMIT } from "@/lib/ai-limits";
import type { PackageTier } from "@/lib/tier";

// Hard ceiling for GET/mock paths = the largest any tier can hold. Per-tier
// caps (free 3 / vip 10) are resolved from the license row in POST.
const MAX_CONVERSATIONS = VIP_AI_CONVERSATION_LIMIT;

// In-memory mock store for when Supabase is not configured
const mockStore = new Map<string, Array<{
  id: string;
  license_key: string;
  title: string;
  messages: unknown[];
  created_at: string;
  updated_at: string;
}>>();

// ─── GET /api/ai/conversations?licenseKey=xxx ───
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    // Identity from the hs-session cookie, NOT a client param (IDOR fix): a user
    // must only ever read their OWN AI conversations.
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const licenseKey = caller.licenseKey;

    if (!isSupabaseServerConfigured) {
      const convs = mockStore.get(licenseKey) || [];
      return NextResponse.json({ conversations: convs });
    }

    const supabase = createServerClient()!;
    const { data, error } = await scopeEq(scope)(
      supabase
        .from("ai_conversations")
        .select("id, title, messages, created_at, updated_at")
        .eq("license_key", licenseKey)
        .order("updated_at", { ascending: false })
        .limit(MAX_CONVERSATIONS)
    );

    if (error) {
      console.error("Fetch AI conversations error:", error);
      return NextResponse.json({ conversations: [] });
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("AI conversations GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/ai/conversations - Create new conversation ───
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    // Identity from the hs-session cookie, NOT the body (IDOR fix).
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const licenseKey = caller.licenseKey;

    // Light cooldown so a loop can't spam-create conversations.
    const cd = checkCooldown(`ai-conv:${licenseKey}`, 2_000);
    if (!cd.allowed) {
      return NextResponse.json(
        { error: "Tunggu sebentar." },
        { status: 429, headers: { "Retry-After": String(cd.retryAfter) } }
      );
    }

    if (!isSupabaseServerConfigured) {
      const id = `chat-${Date.now()}`;
      const conv = {
        id,
        license_key: licenseKey,
        title: "",
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const existing = mockStore.get(licenseKey) || [];
      existing.unshift(conv);
      if (existing.length > MAX_CONVERSATIONS) existing.pop();
      mockStore.set(licenseKey, existing);
      return NextResponse.json({ conversation: conv });
    }

    const supabase = createServerClient()!;

    // Resolve the per-tier cap from the license row (free 3 / vip 10 / admin 10).
    const { data: license } = await supabase
      .from("license_keys")
      .select("package_tier")
      .eq("key", licenseKey)
      .single();
    const tier = (license as { package_tier?: PackageTier } | null)?.package_tier ?? "normal";
    const isAdmin = await isAdminFromSession();
    const limit = aiConversationLimit(isAdmin, tier);

    // Hard block at the cap (scoped count). Unlike the old eviction behaviour,
    // we refuse to create so the user explicitly deletes or upgrades. The
    // client guards this in the UI; this is the server-side safety net.
    const { count } = await scopeEq(scope)(
      supabase
        .from("ai_conversations")
        .select("id", { count: "exact", head: true })
        .eq("license_key", licenseKey)
    );

    if (count && count >= limit) {
      return NextResponse.json(
        { error: "conversation_limit_reached", limit },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ license_key: licenseKey, title: "", messages: [], ...scopeColumns(scope) })
      .select("id, title, messages, created_at, updated_at")
      .single();

    if (error) {
      console.error("Create AI conversation error:", error);
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("AI conversations POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/ai/conversations - Update conversation ───
export async function PUT(request: Request) {
  try {
    const scope = await requireScope(request);
    // Identity from the hs-session cookie (IDOR fix): only edit your OWN convo.
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { id, messages, title } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      for (const [key, convs] of mockStore) {
        const conv = convs.find((c) => c.id === id);
        if (conv) {
          if (messages !== undefined) conv.messages = messages;
          if (title !== undefined) conv.title = title;
          conv.updated_at = new Date().toISOString();
          // Re-sort
          convs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          mockStore.set(key, convs);
          return NextResponse.json({ conversation: conv });
        }
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supabase = createServerClient()!;
    const updates: Record<string, unknown> = {};
    if (messages !== undefined) updates.messages = messages;
    if (title !== undefined) updates.title = title;

    const { data, error } = await scopeEq(scope)(
      supabase
        .from("ai_conversations")
        .update(updates)
        .eq("id", id)
        .eq("license_key", caller.licenseKey)
        .select("id, title, messages, created_at, updated_at")
        .maybeSingle()
    );

    if (error) {
      console.error("Update AI conversation error:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
    // Row gone or not owned by this caller → 404 instead of a 0-row coerce crash.
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("AI conversations PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/ai/conversations ───
export async function DELETE(request: Request) {
  try {
    const scope = await requireScope(request);
    // Identity from the hs-session cookie, NOT the body (IDOR fix).
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const licenseKey = caller.licenseKey;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      const convs = mockStore.get(licenseKey) || [];
      mockStore.set(
        licenseKey,
        convs.filter((c) => c.id !== id)
      );
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const { error } = await scopeEq(scope)(
      supabase
        .from("ai_conversations")
        .delete()
        .eq("id", id)
        .eq("license_key", licenseKey)
    );

    if (error) {
      console.error("Delete AI conversation error:", error);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("AI conversations DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
