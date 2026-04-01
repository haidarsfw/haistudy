import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export interface SupportMessage {
  id: string;
  license_key: string;
  content: string;
  is_admin: boolean;
  sender_name: string;
  created_at: string;
  is_system?: boolean;
}

// In-memory fallback when Supabase is not configured
const memoryStore: SupportMessage[] = [];
const resolvedKeys = new Set<string>();

export async function GET(req: NextRequest) {
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");
  const fetchAll = req.nextUrl.searchParams.get("all") === "true";

  // ─── Admin: Fetch all conversations ───
  if (fetchAll) {
    if (!isSupabaseServerConfigured) {
      // Group memory store by license_key
      const grouped = new Map<string, SupportMessage[]>();
      for (const m of memoryStore) {
        const arr = grouped.get(m.license_key) || [];
        arr.push(m);
        grouped.set(m.license_key, arr);
      }

      const conversations = Array.from(grouped.entries()).map(([key, msgs]) => {
        const last = msgs[msgs.length - 1];
        const userMsgs = msgs.filter((m) => !m.is_admin && !m.is_system);
        const adminMsgs = msgs.filter((m) => m.is_admin);
        return {
          license_key: key,
          user_name: userMsgs[0]?.sender_name || key.slice(0, 8),
          last_message: last.content.slice(0, 100),
          last_time: last.created_at,
          message_count: msgs.length,
          is_resolved: resolvedKeys.has(key),
          unread_count: userMsgs.filter((m) => new Date(m.created_at) > new Date(adminMsgs[adminMsgs.length - 1]?.created_at || 0)).length,
        };
      });

      conversations.sort(
        (a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
      );

      return NextResponse.json({ conversations });
    }

    const supabase = createServerClient()!;

    // Fetch all distinct conversations with latest message
    const { data: allMessages, error } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by license_key
    const grouped = new Map<string, SupportMessage[]>();
    for (const msg of allMessages || []) {
      const key = msg.license_key;
      const arr = grouped.get(key) || [];
      arr.push(msg);
      grouped.set(key, arr);
    }

    const conversations = Array.from(grouped.entries()).map(([key, msgs]) => {
      const last = msgs[msgs.length - 1];
      const userMsgs = msgs.filter((m: SupportMessage) => !m.is_admin && !m.is_system);
      const adminMsgs = msgs.filter((m: SupportMessage) => m.is_admin);
      const isResolved = msgs.some(
        (m: SupportMessage) => m.is_system && m.content.includes("Resolved")
      );
      // Check if resolved was after the latest user message
      const lastResolvedMsg = [...msgs]
        .reverse()
        .find((m: SupportMessage) => m.is_system && m.content.includes("Resolved"));
      const lastUserMsg = [...msgs]
        .reverse()
        .find((m: SupportMessage) => !m.is_admin && !m.is_system);
      const currentlyResolved =
        isResolved &&
        lastResolvedMsg &&
        (!lastUserMsg ||
          new Date(lastResolvedMsg.created_at) > new Date(lastUserMsg.created_at));

      // Unread = user messages after last admin message
      const lastAdminTime = adminMsgs.length > 0
        ? new Date(adminMsgs[adminMsgs.length - 1].created_at).getTime()
        : 0;
      const unreadCount = userMsgs.filter(
        (m: SupportMessage) => new Date(m.created_at).getTime() > lastAdminTime
      ).length;

      return {
        license_key: key,
        user_name: userMsgs[0]?.sender_name || key.slice(0, 8),
        last_message: last.content.slice(0, 100),
        last_time: last.created_at,
        message_count: msgs.length,
        is_resolved: currentlyResolved || false,
        unread_count: currentlyResolved ? 0 : unreadCount,
      };
    });

    // Sort by last activity, unresolved first
    conversations.sort((a, b) => {
      if (a.is_resolved !== b.is_resolved) return a.is_resolved ? 1 : -1;
      return new Date(b.last_time).getTime() - new Date(a.last_time).getTime();
    });

    return NextResponse.json({ conversations });
  }

  // ─── User: Fetch messages for a specific license key ───
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

// ─── PATCH: Resolve a conversation ───
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, action } = body;

    if (action === "resolve" && licenseKey) {
      const systemMsg: SupportMessage = {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        license_key: licenseKey,
        content: "✅ Masalah telah diselesaikan oleh Admin. Jika ada pertanyaan lain, silakan kirim pesan baru.",
        is_admin: true,
        sender_name: "System",
        created_at: new Date().toISOString(),
        is_system: true,
      };

      if (!isSupabaseServerConfigured) {
        memoryStore.push(systemMsg);
        resolvedKeys.add(licenseKey);
        return NextResponse.json({ success: true, message: systemMsg });
      }

      const supabase = createServerClient()!;
      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          license_key: systemMsg.license_key,
          content: systemMsg.content,
          is_admin: true,
          sender_name: "System",
          is_system: true,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
