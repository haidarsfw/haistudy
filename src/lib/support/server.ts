/**
 * Shared server-side helpers for /api/support/* routes.
 * Resolves sender identity from cookies, normalizes message rows,
 * and centralizes rate-limit state (in-memory, per-process).
 */

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type {
  SupportMessage,
  SupportReaction,
  SupportReadReceipt,
  SupportConversationSummary,
} from "@/types";

/* ─────────────────────────── Sender identity ─────────────────────────── */

export interface SupportSender {
  licenseKey: string | null; // null if no session cookie at all
  isAdmin: boolean;
  name: string | null;
}

/**
 * Resolve who is calling this endpoint from cookies.
 * `hs-session` cookie value IS the license_key (see auth/session.ts).
 * `hs-admin=1` flags admin. We optionally re-validate is_admin against DB.
 */
export async function resolveSupportSender(opts?: {
  validateAdmin?: boolean;
}): Promise<SupportSender> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("hs-session");
  const adminCookie = cookieStore.get("hs-admin");

  const licenseKey = sessionCookie?.value ?? null;
  let isAdmin = adminCookie?.value === "1";
  let name: string | null = null;

  if (licenseKey && isSupabaseServerConfigured) {
    const supabase = createServerClient()!;
    const { data } = await supabase
      .from("license_keys")
      .select("name, is_admin")
      .eq("key", licenseKey)
      .maybeSingle();

    if (data) {
      name = (data.name as string) || null;
      if (opts?.validateAdmin) {
        isAdmin = Boolean(data.is_admin) && isAdmin;
      }
    }
  }

  return { licenseKey, isAdmin, name };
}

/* ─────────────────────────── Row normalization ─────────────────────── */

type RawMessageRow = {
  id: string;
  license_key: string;
  content: string;
  type?: string | null;
  media_url?: string | null;
  is_admin: boolean;
  is_system?: boolean | null;
  sender_name: string;
  author_license_key?: string | null;
  reply_to_id?: string | null;
  reply_to_name?: string | null;
  reply_to_content?: string | null;
  edited_at?: string | null;
  deleted?: boolean | null;
  client_nonce?: string | null;
  created_at: string;
};

export function rowToSupportMessage(row: RawMessageRow): SupportMessage {
  // Backwards compat: rows that still have content="[image]URL\n..." with
  // no type/media_url filled get normalized at read-time too.
  let type = (row.type ?? "text") as SupportMessage["type"];
  let mediaUrl = row.media_url ?? null;
  let content = row.content ?? "";

  if (type === "text" && content.startsWith("[image]")) {
    const lines = content.split("\n");
    mediaUrl = lines[0].slice(7);
    content = lines.slice(1).join("\n");
    type = "image";
  }

  if (row.is_system) type = "system";

  return {
    id: row.id,
    licenseKey: row.license_key,
    content,
    type,
    mediaUrl,
    isAdmin: row.is_admin,
    isSystem: Boolean(row.is_system),
    senderName: row.sender_name,
    authorLicenseKey: row.author_license_key ?? null,
    replyToId: row.reply_to_id ?? null,
    replyToName: row.reply_to_name ?? null,
    replyToContent: row.reply_to_content ?? null,
    editedAt: row.edited_at ?? null,
    deleted: Boolean(row.deleted),
    createdAt: row.created_at,
    clientNonce: row.client_nonce ?? undefined,
    status: "sent",
  };
}

type RawReactionRow = {
  id: string;
  message_id: string;
  license_key: string;
  reactor_key: string;
  reactor_name: string;
  is_admin: boolean;
  emoji: string;
  created_at: string;
};

export function rowToSupportReaction(row: RawReactionRow): SupportReaction {
  return {
    id: row.id,
    messageId: row.message_id,
    licenseKey: row.license_key,
    reactorKey: row.reactor_key,
    reactorName: row.reactor_name,
    isAdmin: row.is_admin,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

type RawReceiptRow = {
  id: string;
  license_key: string;
  message_id: string;
  reader_kind: "user" | "admin";
  read_at: string;
};

export function rowToSupportReceipt(row: RawReceiptRow): SupportReadReceipt {
  return {
    id: row.id,
    licenseKey: row.license_key,
    messageId: row.message_id,
    readerKind: row.reader_kind,
    readAt: row.read_at,
  };
}

/* ─────────────────────────── In-memory rate limits ────────────────── */

const rateBuckets = new Map<string, number[]>();

/** Returns true if this action is allowed (and records it). */
export function rateLimit(key: string, perMs: number, max = 1): boolean {
  const now = Date.now();
  const cutoff = now - perMs;
  const bucket = (rateBuckets.get(key) ?? []).filter((t) => t > cutoff);
  if (bucket.length >= max) {
    rateBuckets.set(key, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
  return true;
}

/* ─────────────────────────── Server channel broadcast ─────────────── */

/**
 * Broadcast a typing event from the server using service-role.
 * Client subscribes to channel `support:typing:<licenseKey>`.
 *
 * `senderKey` lets the receiving client filter out broadcasts originated by
 * itself even when its `kind` differs from the broadcast's kind (e.g. admin
 * using the user-side panel).
 */
export async function broadcastTyping(
  supabase: SupabaseClient,
  licenseKey: string,
  payload: {
    kind: "user" | "admin";
    name: string;
    startedAt: string;
    senderKey: string;
  }
): Promise<void> {
  const channel = supabase.channel(`support:typing:${licenseKey}`);
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
    setTimeout(resolve, 1500); // safety
  });
  await channel.send({
    type: "broadcast",
    event: "typing",
    payload,
  });
  await supabase.removeChannel(channel);
}

/* ─────────────────────────── Conversation summary ─────────────────── */

export type { SupportConversationSummary };
