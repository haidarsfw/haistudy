import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export interface SupportMessage {
  id: string;
  license_key: string;
  content: string;
  is_admin: boolean;
  sender_name: string;
  created_at: string;
}

// In-memory fallback when Supabase is not configured
const memoryStore: SupportMessage[] = [];

export async function GET(req: NextRequest) {
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");
  if (!licenseKey) {
    return NextResponse.json({ error: "Missing licenseKey" }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    const filtered = memoryStore
      .filter((m) => m.license_key === licenseKey)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return NextResponse.json({ messages: filtered });
  }

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("license_key", licenseKey)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, content, isAdmin, senderName } = body;

    if (!licenseKey || !content?.trim() || !senderName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const message: SupportMessage = {
      id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      license_key: licenseKey,
      content: content.trim().slice(0, 2000),
      is_admin: isAdmin || false,
      sender_name: senderName,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseServerConfigured) {
      memoryStore.push(message);
      return NextResponse.json({ success: true, message });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        license_key: message.license_key,
        content: message.content,
        is_admin: message.is_admin,
        sender_name: message.sender_name,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
