import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { parseMentions, hasMentions } from "@/lib/mentions";
import type { ChatChannel, ChatMessage } from "@/types";
import { CHAT_MAX_MESSAGES } from "@/lib/constants";
import { requireScope, scopeColumns, scopeEq, ScopeError, assertNotPreview } from "@/lib/auth/scope-check";
import { capitalizeFirst } from "@/lib/name";
import { canUseVip, type PackageTier } from "@/lib/tier";

function normalizeChannel(raw: unknown): ChatChannel {
  return raw === "vip-lounge" ? "vip-lounge" : "global";
}

// Resolve the requester's tier from cookies. hs-session holds the license key
// (same lookup admin-guard uses); hs-admin gates admin. Used to gate vip-lounge.
async function resolveSessionTier(
  bodyTier?: PackageTier | null
): Promise<{ isAdmin: boolean; tier: PackageTier }> {
  const isAdmin = await isAdminFromCookies();
  if (!isSupabaseServerConfigured) {
    return { isAdmin, tier: (bodyTier ?? "normal") as PackageTier };
  }
  const jar = await cookies();
  const lk = jar.get("hs-session")?.value ?? "";
  if (!lk) return { isAdmin, tier: "normal" };
  const supabase = createServerClient()!;
  const { data } = await supabase
    .from("license_keys")
    .select("package_tier")
    .eq("key", lk)
    .single();
  const tier = ((data as { package_tier?: PackageTier } | null)?.package_tier ??
    "normal") as PackageTier;
  return { isAdmin, tier };
}

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
      channel: "global",
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
      channel: "global",
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
      channel: "global",
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
    authorName: capitalizeFirst(row.author_name as string),
    authorClass: (row.author_class as string) || "",
    licenseKey: (row.license_key as string) || null,
    isAdmin: row.is_admin as boolean,
    isTester: (row.is_tester as boolean) || false,
    packageTier: (row.package_tier as ChatMessage["packageTier"]) || undefined,
    deleted: row.deleted as boolean,
    replyToId: (row.reply_to_id as string) || null,
    replyToName: (row.reply_to_name as string) || null,
    replyToContent: (row.reply_to_content as string) || null,
    channel: ((row.channel as ChatMessage["channel"]) || "global"),
    createdAt: row.created_at as string,
  };
}

// ─── GET /api/chat/messages?before=cursor ───
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before"); // cursor: created_at timestamp
    const channel = normalizeChannel(searchParams.get("channel"));

    // VIP Lounge is read-gated: only VIP/admin may fetch its messages.
    if (channel === "vip-lounge") {
      const { isAdmin, tier } = await resolveSessionTier();
      if (!canUseVip(isAdmin, tier)) {
        return NextResponse.json({ error: "vip_lounge_locked" }, { status: 403 });
      }
    }

    if (!isSupabaseServerConfigured) {
      seedMockMessages();
      let msgs = [...mockMessages]
        .filter((m) => m.channel === channel)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (before) {
        msgs = msgs.filter((m) => m.createdAt < before);
        msgs = msgs.slice(-CHAT_MAX_MESSAGES);
      } else {
        msgs = msgs.slice(-CHAT_MAX_MESSAGES);
      }
      return NextResponse.json({ messages: msgs });
    }

    const supabase = createServerClient()!;
    let query = supabase
      .from("chat_messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: false })
      .limit(CHAT_MAX_MESSAGES);

    query = scopeEq(scope)(query);

    if (before) {
      // Use created_at for reliable chronological pagination
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;
    if (error) throw error;

    const messages = (data || []).map(mapRowToMessage).reverse();
    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Chat messages GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/chat/messages - Send message ───
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const {
      content,
      type = "text",
      mediaUrl,
      authorId,
      authorName,
      authorClass,
      isTester,
      packageTier,
      replyToId,
      replyToName,
      replyToContent,
    } = body;
    const channel = normalizeChannel(body.channel);

    // Trust cookies, not client-provided flags. Resolve real tier for the
    // vip-lounge write gate (don't trust the body's packageTier).
    const { isAdmin, tier } = await resolveSessionTier(packageTier);

    // Denormalize the author's license key from the session cookie (server-
    // trusted; same value resolveSessionTier reads) so the profile popover can
    // resolve PublicProfile. Falls back to null → popover degrades to name/tier.
    const authorLicenseKey =
      (await cookies()).get("hs-session")?.value?.toUpperCase() || null;

    // VIP Lounge is write-gated: only VIP/admin may post there.
    if (channel === "vip-lounge" && !canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_lounge_locked" }, { status: 403 });
    }

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

    if (type === "text" && (content?.length ?? 0) > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
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
        licenseKey: authorLicenseKey,
        isAdmin: isAdmin || false,
        isTester: isTester || false,
        packageTier: packageTier || undefined,
        deleted: false,
        replyToId: replyToId || null,
        replyToName: replyToName || null,
        replyToContent: replyToContent || null,
        channel,
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
        license_key: authorLicenseKey,
        is_admin: isAdmin || false,
        is_tester: isTester || false,
        package_tier: packageTier || null,
        reply_to_id: replyToId || null,
        reply_to_name: replyToName || null,
        reply_to_content: replyToContent || null,
        channel,
        ...scopeColumns(scope),
      })
      .select()
      .single();

    if (error) throw error;

    const createdMessage = mapRowToMessage(data);

    // ─── Server-side mention notification processing (awaited) ───
    const trimmedContent = (content || "").trim();
    if (type === "text" && hasMentions(trimmedContent)) {
      try {
        const mentions = parseMentions(trimmedContent);
        if (mentions.length > 0) {
          const hasAll = mentions.some((m) => m.isAll);

          // Only admin can @all
          if (!hasAll || isAdmin) {
            // Fetch all active users for resolution
            const { data: allUsers, error: usersError } = await supabase
              .from("activations")
              .select("license_key, user_name");

            if (usersError) {
              console.error("Mention: Failed to fetch users:", usersError.message);
            }

            if (allUsers && allUsers.length > 0) {
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
                // @all - notify everyone except sender
                for (const user of allUsers) {
                  const uName = (user.user_name || "").toLowerCase();
                  if (uName === authorName?.toLowerCase()) continue;
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
                  const uName = (user.user_name || "").toLowerCase();
                  if (uName === authorName?.toLowerCase()) continue;
                  const firstName = uName.split(" ")[0];
                  if (mentionedNames.has(uName) || mentionedNames.has(firstName)) {
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
                const scopedRows = notifRows.map((r) => ({ ...r, ...scopeColumns(scope) }));
                const { error: insertError } = await supabase.from("notifications").insert(scopedRows);
                if (insertError) {
                  console.error("Mention: Failed to insert notifications:", insertError.message);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Mention notification error:", e);
      }
    }

    return NextResponse.json({ message: createdMessage });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Chat messages POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/chat/messages - Soft delete message or clear all (admin) ───
export async function DELETE(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const isAdmin = await isAdminFromCookies();

    // Admin: clear all messages within this scope
    if (body.clearAll) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
      if (!isSupabaseServerConfigured) {
        mockMessages.length = 0;
        return NextResponse.json({ success: true, cleared: true });
      }
      const supabase = createServerClient()!;
      const { error } = await scopeEq(scope)(
        supabase
          .from("chat_messages")
          .update({ deleted: true, content: "", media_url: null })
          .neq("deleted", true)
      );
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

    // Non-admin deletes require a valid session cookie
    if (!isAdmin) {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("hs-session")?.value;
      if (!sessionCookie) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
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

    const { error } = await scopeEq(scope)(
      supabase
        .from("chat_messages")
        .update({ deleted: true, content: "", media_url: null })
        .eq("id", messageId)
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Chat messages DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
