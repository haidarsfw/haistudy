import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

const MAX_CONVERSATIONS = 5;

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
  const { searchParams } = new URL(request.url);
  const licenseKey = searchParams.get("licenseKey");

  if (!licenseKey) {
    return NextResponse.json({ error: "licenseKey required" }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    const convs = mockStore.get(licenseKey) || [];
    return NextResponse.json({ conversations: convs });
  }

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, messages, created_at, updated_at")
    .eq("license_key", licenseKey)
    .order("updated_at", { ascending: false })
    .limit(MAX_CONVERSATIONS);

  if (error) {
    console.error("Fetch AI conversations error:", error);
    return NextResponse.json({ conversations: [] });
  }

  return NextResponse.json({ conversations: data || [] });
}

// ─── POST /api/ai/conversations - Create new conversation ───
export async function POST(request: Request) {
  const body = await request.json();
  const { licenseKey } = body;

  if (!licenseKey) {
    return NextResponse.json({ error: "licenseKey required" }, { status: 400 });
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

  // Check count - delete oldest if at max
  const { count } = await supabase
    .from("ai_conversations")
    .select("id", { count: "exact", head: true })
    .eq("license_key", licenseKey);

  if (count && count >= MAX_CONVERSATIONS) {
    const { data: oldest } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("license_key", licenseKey)
      .order("updated_at", { ascending: true })
      .limit(1);

    if (oldest?.[0]) {
      await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", oldest[0].id);
    }
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ license_key: licenseKey, title: "", messages: [] })
    .select("id, title, messages, created_at, updated_at")
    .single();

  if (error) {
    console.error("Create AI conversation error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}

// ─── PUT /api/ai/conversations - Update conversation ───
export async function PUT(request: Request) {
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

  const { data, error } = await supabase
    .from("ai_conversations")
    .update(updates)
    .eq("id", id)
    .select("id, title, messages, created_at, updated_at")
    .single();

  if (error) {
    console.error("Update AI conversation error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}

// ─── DELETE /api/ai/conversations ───
export async function DELETE(request: Request) {
  const body = await request.json();
  const { id, licenseKey } = body;

  if (!id || !licenseKey) {
    return NextResponse.json(
      { error: "id and licenseKey required" },
      { status: 400 }
    );
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
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("license_key", licenseKey);

  if (error) {
    console.error("Delete AI conversation error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
