import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import {
  resolveSupportSender,
  rowToSupportMessage,
} from "@/lib/support/server";
import type { SupportConversationSummary, SupportMessage } from "@/types";

/* ─────────────────────────── Legacy in-memory fallback ──────────────── */

interface LegacyRow {
  id: string;
  license_key: string;
  content: string;
  type: string;
  media_url: string | null;
  is_admin: boolean;
  is_system: boolean;
  sender_name: string;
  author_license_key: string | null;
  reply_to_id: string | null;
  reply_to_name: string | null;
  reply_to_content: string | null;
  edited_at: string | null;
  deleted: boolean;
  unsent_by: string | null;
  unsent_at: string | null;
  is_internal: boolean;
  client_nonce: string | null;
  created_at: string;
}

const memoryStore: LegacyRow[] = [];
const resolvedKeys = new Set<string>();

/* ─────────────────────────── GET ─────────────────────────────────── */

export async function GET(req: NextRequest) {
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");
  const fetchAll = req.nextUrl.searchParams.get("all") === "true";

  // ── Admin: list all conversations ──
  if (fetchAll) {
    if (!(await isAdminFromCookies())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      const conversations = summarizeMemoryConversations();
      return NextResponse.json({ conversations });
    }

    const supabase = createServerClient()!;
    const { data: allMessages, error } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const messages = (allMessages || []).map(rowToSupportMessage);

    // Group by license_key
    const grouped = new Map<string, SupportMessage[]>();
    for (const msg of messages) {
      const arr = grouped.get(msg.licenseKey) || [];
      arr.push(msg);
      grouped.set(msg.licenseKey, arr);
    }

    // Batch role lookup
    const licenseKeys = Array.from(grouped.keys());
    const roleMap = new Map<
      string,
      { isAdmin: boolean; isTester: boolean; packageTier: string | null }
    >();
    if (licenseKeys.length > 0) {
      const { data: licenses } = await supabase
        .from("license_keys")
        .select("key, is_admin, is_tester, package_tier")
        .in("key", licenseKeys);
      for (const l of licenses || []) {
        roleMap.set(l.key as string, {
          isAdmin: Boolean(l.is_admin),
          isTester: Boolean(l.is_tester),
          packageTier: (l.package_tier as string) ?? null,
        });
      }
    }

    const conversations: SupportConversationSummary[] = Array.from(
      grouped.entries()
    ).map(([key, msgs]) => buildSummary(key, msgs, roleMap.get(key)));

    conversations.sort((a, b) => {
      if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
      return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
    });

    return NextResponse.json({ conversations });
  }

  // ── User/admin: messages for one conversation ──
  if (!licenseKey) {
    return NextResponse.json({ error: "Missing licenseKey" }, { status: 400 });
  }

  // Internal-note filter: non-admin requesters never see is_internal=true rows
  const requesterIsAdmin = await isAdminFromCookies();

  if (!isSupabaseServerConfigured) {
    const filtered = memoryStore
      .filter(
        (m) =>
          m.license_key === licenseKey &&
          (requesterIsAdmin || !(m as { is_internal?: boolean }).is_internal)
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map(rowToSupportMessage);
    return NextResponse.json({ messages: filtered });
  }

  const supabase = createServerClient()!;
  let query = supabase
    .from("support_messages")
    .select("*")
    .eq("license_key", licenseKey);
  if (!requesterIsAdmin) {
    query = query.eq("is_internal", false);
  }
  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = (data || []).map(rowToSupportMessage);
  return NextResponse.json({ messages });
}

/* ─────────────────────────── POST: send ─────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      licenseKey,
      content: rawContent,
      senderName,
      type: rawType,
      mediaUrl: rawMediaUrl,
      replyToId,
      replyToName,
      replyToContent,
      isInternal: rawIsInternal,
      clientNonce,
    } = body as {
      licenseKey?: string;
      content?: string;
      senderName?: string;
      type?: string;
      mediaUrl?: string | null;
      replyToId?: string | null;
      replyToName?: string | null;
      replyToContent?: string | null;
      isInternal?: boolean;
      clientNonce?: string | null;
    };

    if (!licenseKey || !senderName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sender = await resolveSupportSender();
    const isAdmin = sender.isAdmin;

    // Normalize incoming type/content/media. Backwards compat: if old client
    // sends content="[image]URL\n..." with no type, normalize to image+media.
    let type: "text" | "image" | "audio" = "text";
    if (rawType === "image" || rawType === "audio") type = rawType;

    let content = (rawContent ?? "").trim();
    let mediaUrl: string | null = rawMediaUrl ?? null;

    if (!type || type === "text") {
      if (content.startsWith("[image]")) {
        const lines = content.split("\n");
        mediaUrl = lines[0].slice(7);
        content = lines.slice(1).join("\n");
        type = "image";
      }
    }

    content = content.slice(0, 4000); // markdown allows longer

    if (type === "text" && !content) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    if ((type === "image" || type === "audio") && !mediaUrl) {
      return NextResponse.json({ error: "Missing media URL" }, { status: 400 });
    }

    // Internal-note: admin-only privilege
    const isInternal = Boolean(rawIsInternal);
    if (isInternal && !isAdmin) {
      return NextResponse.json(
        { error: "Internal notes are admin-only" },
        { status: 403 }
      );
    }

    if (!isSupabaseServerConfigured) {
      // Dedup by clientNonce in memory
      if (clientNonce) {
        const existing = memoryStore.find((m) => m.client_nonce === clientNonce);
        if (existing) {
          return NextResponse.json({
            success: true,
            message: rowToSupportMessage(existing),
          });
        }
      }
      const row: LegacyRow = {
        id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        license_key: licenseKey,
        content,
        type,
        media_url: mediaUrl,
        is_admin: isAdmin,
        is_system: false,
        sender_name: senderName,
        author_license_key: sender.licenseKey,
        reply_to_id: replyToId ?? null,
        reply_to_name: replyToName ?? null,
        reply_to_content: replyToContent ?? null,
        edited_at: null,
        deleted: false,
        unsent_by: null,
        unsent_at: null,
        is_internal: isInternal,
        client_nonce: clientNonce ?? null,
        created_at: new Date().toISOString(),
      };
      memoryStore.push(row);
      return NextResponse.json({
        success: true,
        message: rowToSupportMessage(row),
      });
    }

    const supabase = createServerClient()!;

    // Dedup by client_nonce — return existing row if already inserted
    if (clientNonce) {
      const { data: existing } = await supabase
        .from("support_messages")
        .select("*")
        .eq("client_nonce", clientNonce)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({
          success: true,
          message: rowToSupportMessage(existing),
        });
      }
    }

    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        license_key: licenseKey,
        content,
        type,
        media_url: mediaUrl,
        is_admin: isAdmin,
        sender_name: senderName,
        author_license_key: sender.licenseKey,
        reply_to_id: replyToId ?? null,
        reply_to_name: replyToName ?? null,
        reply_to_content: replyToContent ?? null,
        is_internal: isInternal,
        client_nonce: clientNonce ?? null,
      })
      .select()
      .single();

    if (error) {
      // Unique-violation race: another request beat us with same nonce
      if (
        clientNonce &&
        (error.code === "23505" || /duplicate|unique/i.test(error.message))
      ) {
        const { data: existing } = await supabase
          .from("support_messages")
          .select("*")
          .eq("client_nonce", clientNonce)
          .maybeSingle();
        if (existing) {
          return NextResponse.json({
            success: true,
            message: rowToSupportMessage(existing),
          });
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: rowToSupportMessage(data),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/* ─────────────────────────── PATCH: resolve ─────────────────────── */

export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdminFromCookies())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { licenseKey, action } = body as {
      licenseKey?: string;
      action?: string;
    };

    if (action !== "resolve" || !licenseKey) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const systemContent =
      "✅ Masalah telah diselesaikan oleh Admin. Jika ada pertanyaan lain, silakan kirim pesan baru.";

    if (!isSupabaseServerConfigured) {
      const row: LegacyRow = {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        license_key: licenseKey,
        content: systemContent,
        type: "system",
        media_url: null,
        is_admin: true,
        is_system: true,
        sender_name: "System",
        author_license_key: null,
        reply_to_id: null,
        reply_to_name: null,
        reply_to_content: null,
        edited_at: null,
        deleted: false,
        unsent_by: null,
        unsent_at: null,
        is_internal: false,
        client_nonce: null,
        created_at: new Date().toISOString(),
      };
      memoryStore.push(row);
      resolvedKeys.add(licenseKey);
      return NextResponse.json({
        success: true,
        message: rowToSupportMessage(row),
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        license_key: licenseKey,
        content: systemContent,
        type: "system",
        is_admin: true,
        sender_name: "System",
        is_system: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: rowToSupportMessage(data),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/* ─────────────────────────── Conversation summary ─────────────────── */

function buildSummary(
  key: string,
  msgs: SupportMessage[],
  role?: { isAdmin: boolean; isTester: boolean; packageTier: string | null }
): SupportConversationSummary {
  // Last preview: skip deleted + internal notes (those don't represent
  // conversation surface activity for the admin sidebar).
  const visible = msgs.filter((m) => !m.deleted && !m.isInternal);
  const last = visible[visible.length - 1] ?? msgs[msgs.length - 1];
  const userMsgs = msgs.filter((m) => !m.isAdmin && !m.isSystem && !m.isInternal);
  const adminMsgs = msgs.filter((m) => m.isAdmin && !m.isSystem && !m.isInternal);

  const lastSystemResolve = [...msgs]
    .reverse()
    .find((m) => m.isSystem && m.content.includes("diselesaikan"));
  const lastUserMsg = [...msgs].reverse().find((m) => !m.isAdmin && !m.isSystem);
  const isResolved = Boolean(
    lastSystemResolve &&
      (!lastUserMsg ||
        new Date(lastSystemResolve.createdAt) > new Date(lastUserMsg.createdAt))
  );

  const lastAdminTime =
    adminMsgs.length > 0
      ? new Date(adminMsgs[adminMsgs.length - 1].createdAt).getTime()
      : 0;
  const unreadCount = userMsgs.filter(
    (m) => new Date(m.createdAt).getTime() > lastAdminTime
  ).length;

  const lastPreview =
    last.type === "image"
      ? "[Gambar]"
      : last.type === "audio"
      ? "[Pesan suara]"
      : (last.content || "").slice(0, 100);

  return {
    licenseKey: key,
    userName: userMsgs[0]?.senderName || key.slice(0, 8),
    lastMessage: lastPreview,
    lastTime: last.createdAt,
    messageCount: msgs.length,
    isResolved,
    unreadCount: isResolved ? 0 : unreadCount,
    isAdmin: role?.isAdmin ?? false,
    isTester: role?.isTester ?? false,
    packageTier: (role?.packageTier as SupportConversationSummary["packageTier"]) ?? null,
  };
}

function summarizeMemoryConversations(): SupportConversationSummary[] {
  const grouped = new Map<string, LegacyRow[]>();
  for (const row of memoryStore) {
    const arr = grouped.get(row.license_key) || [];
    arr.push(row);
    grouped.set(row.license_key, arr);
  }
  const out: SupportConversationSummary[] = [];
  for (const [key, rows] of grouped) {
    const msgs = rows.map(rowToSupportMessage);
    out.push(buildSummary(key, msgs));
  }
  out.sort((a, b) => {
    if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
    return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
  });
  return out;
}
