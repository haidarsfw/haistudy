import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { parseMentions, hasMentions } from "@/lib/mentions";
import type { ChatMessage } from "@/types";
import { CHAT_MAX_MESSAGES } from "@/lib/constants";

// ─── Mock store for development without Supabase ───
const mockMessages: ChatMessage[] = [];

function seedMockMessages() {
  if (mockMessages.length > 0) return;
  const now = Date.now();
  const seed: ChatMessage[] = [
    {
      id: "mock-msg-1",
      content: "Halo semuanya! Ada yang mau diskusi materi Statistik?",
      type: "text",
      mediaUrl: null,
      authorId: "device-admin",
      authorName: "Admin",
      authorClass: "LA86",
      isAdmin: true,
      isTester: false,
      deleted: false,
      replyToId: null,
      replyToName: null,
      replyToContent: null,
      createdAt: new Date(now - 3600_000).toISOString(),
    },
    {
      id: "mock-msg-2",
      content: "Saya mau tanya soal regresi linear 🙋",
      type: "text",
      mediaUrl: null,
      authorId: "device-user-1",
      authorName: "Budi",
      authorClass: "LB86",
      isAdmin: false,
      isTester: false,
      deleted: false,
      replyToId: null,
      replyToName: null,
      replyToContent: null,
      createdAt: new Date(now - 3000_000).toISOString(),
    },
    {
      id: "mock-msg-3",
      content: "Boleh, tanya aja di sini!",
      type: "text",
      mediaUrl: null,
      authorId: "device-admin",
      authorName: "Admin",
      authorClass: "LA86",
      isAdmin: true,
      isTester: false,
      deleted: false,
      replyToId: "mock-msg-2",
      replyToName: "Budi",
      replyToContent: "Saya mau tanya soal regresi linear 🙋",
      createdAt: new Date(now - 2400_000).toISOString(),
    },
  ];
  mockMessages.push(...seed);
}

function mapRowToMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    content: row.content as string,
    type: row.type as ChatMessage["type"],
    mediaUrl: (row.media_url as string) || null,
    authorId: row.author_id as string,
    authorName: row.author_name as string,
    authorClass: (row.author_class as string) || "",
    isAdmin: row.is_admin as boolean,
    isTester: (row.is_tester as boolean) || false,
    packageTier: (row.package_tier as ChatMessage["packageTier"]) || undefined,
    deleted: row.deleted as boolean,
    replyToId: (row.reply_to_id as string) || null,
    replyToName: (row.reply_to_name as string) || null,
    replyToContent: (row.reply_to_content as string) || null,
    createdAt: row.created_at as string,
  };
}

// ─── GET /api/chat/messages?before=cursor ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before"); // cursor for pagination

    if (!isSupabaseServerConfigured) {
      seedMockMessages();
      let msgs = [...mockMessages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      if (before) {
        const idx = msgs.findIndex((m) => m.id === before);
        if (idx > 0) msgs = msgs.slice(Math.max(0, idx - CHAT_MAX_MESSAGES), idx);
      } else {
        msgs = msgs.slice(-CHAT_MAX_MESSAGES);
      }
      return NextResponse.json({ messages: msgs });
    }

    const supabase = createServerClient()!;
    let query = supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CHAT_MAX_MESSAGES);

    if (before) {
      query = query.lt("id", before);
    }

    const { data, error } = await query;
    if (error) throw error;

    const messages = (data || []).map(mapRowToMessage).reverse();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Chat messages GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/chat/messages - Send message ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      content,
      type = "text",
      mediaUrl,
      authorId,
      authorName,
      authorClass,
      isAdmin,
      isTester,
      packageTier,
      replyToId,
      replyToName,
      replyToContent,
    } = body;

    if (!authorId || !authorName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (type === "text" && !content?.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      seedMockMessages();
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        content: (content || "").trim(),
        type,
        mediaUrl: mediaUrl || null,
        authorId,
        authorName,
        authorClass: authorClass || "",
        isAdmin: isAdmin || false,
        isTester: isTester || false,
        packageTier: packageTier || undefined,
        deleted: false,
        replyToId: replyToId || null,
        replyToName: replyToName || null,
        replyToContent: replyToContent || null,
        createdAt: new Date().toISOString(),
      };
      mockMessages.push(message);
      return NextResponse.json({ message });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        content: (content || "").trim(),
        type,
        media_url: mediaUrl || null,
        author_id: authorId,
        author_name: authorName,
        author_class: authorClass || "",
        is_admin: isAdmin || false,
        is_tester: isTester || false,
        package_tier: packageTier || null,
        reply_to_id: replyToId || null,
        reply_to_name: replyToName || null,
        reply_to_content: replyToContent || null,
      })
      .select()
      .single();

    if (error) throw error;

    const createdMessage = mapRowToMessage(data);

    // ─── Server-side mention notification processing ───
    const trimmedContent = (content || "").trim();
    if (type === "text" && hasMentions(trimmedContent)) {
      (async () => {
        try {
          const mentions = parseMentions(trimmedContent);
          if (mentions.length === 0) return;

          const hasAll = mentions.some((m) => m.isAll);

          // Only admin can @all
          if (hasAll && !isAdmin) return;

          // Fetch all active users for resolution
          const { data: allUsers } = await supabase
            .from("activations")
            .select("license_key, user_name");

          if (!allUsers?.length) return;

          const preview = trimmedContent.length > 100
            ? trimmedContent.slice(0, 100) + "…"
            : trimmedContent;

          const notifRows: Array<{
            license_key: string;
            type: string;
            sender_name: string;
            preview: string;
            context: string;
            message_id: string;
          }> = [];

          if (hasAll) {
            // @all — notify everyone except sender
            for (const user of allUsers) {
              if (user.user_name?.toLowerCase() === authorName?.toLowerCase()) continue;
              notifRows.push({
                license_key: user.license_key,
                type: "mention_all",
                sender_name: authorName,
                preview,
                context: "chat",
                message_id: createdMessage.id,
              });
            }
          } else {
            // Individual @username mentions
            const mentionedNames = new Set(mentions.map((m) => m.username));
            for (const user of allUsers) {
              if (user.user_name?.toLowerCase() === authorName?.toLowerCase()) continue;
              if (mentionedNames.has(user.user_name?.toLowerCase())) {
                notifRows.push({
                  license_key: user.license_key,
                  type: "mention",
                  sender_name: authorName,
                  preview,
                  context: "chat",
                  message_id: createdMessage.id,
                });
              }
            }
          }

          if (notifRows.length > 0) {
            await supabase.from("notifications").insert(notifRows);
          }
        } catch (e) {
          console.error("Mention notification error:", e);
        }
      })();
    }

    return NextResponse.json({ message: createdMessage });
  } catch (error) {
    console.error("Chat messages POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/chat/messages - Soft delete message or clear all (admin) ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const isAdmin = await isAdminFromCookies();

    // Admin: clear all messages
    if (body.clearAll) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
      if (!isSupabaseServerConfigured) {
        mockMessages.length = 0;
        return NextResponse.json({ success: true, cleared: true });
      }
      const supabase = createServerClient()!;
      const { error } = await supabase
        .from("chat_messages")
        .update({ deleted: true, content: "", media_url: null })
        .neq("deleted", true);
      if (error) throw error;
      return NextResponse.json({ success: true, cleared: true });
    }

    // Single message delete
    const { messageId, requesterId } = body;

    if (!messageId || !requesterId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const msg = mockMessages.find((m) => m.id === messageId);
      if (msg) {
        if (msg.authorId !== requesterId && !isAdmin) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        msg.deleted = true;
        msg.content = "";
        msg.mediaUrl = null;
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    // Verify ownership or admin
    if (!isAdmin) {
      const { data: msg } = await supabase
        .from("chat_messages")
        .select("author_id")
        .eq("id", messageId)
        .single();

      if (!msg || msg.author_id !== requesterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from("chat_messages")
      .update({ deleted: true, content: "", media_url: null })
      .eq("id", messageId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat messages DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
