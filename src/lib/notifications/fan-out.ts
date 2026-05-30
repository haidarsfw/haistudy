/**
 * Server-side fan-out for new support_messages.
 *
 * Determines recipients (admins or conversation owner), respects mutes + per-channel
 * preferences, inserts in-app notifications row (drives realtime + bell), coalesces
 * within a 30s window per (recipient, conversation), then pushes Web Push to all
 * registered subscriptions.
 *
 * Designed to run via `waitUntil` from the support POST route so the response
 * returns in <50ms while fan-out continues in the background.
 */

import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { sendWebPush, type PushSubLite } from "@/lib/push/send";
import type { SupportMessage } from "@/types";

interface Recipient {
  lk: string;
  name: string;
  isAdmin: boolean;
}

interface FanOutOpts {
  message: SupportMessage;
  senderLicenseKey: string;
  senderName: string;
  senderIsAdmin: boolean;
}

const COALESCE_WINDOW_MS = 30_000;

function makePreview(msg: SupportMessage): string {
  if (msg.type === "image") return "📷 Foto";
  if (msg.type === "audio") return "🎤 Pesan suara";
  return (msg.content || "").slice(0, 100);
}

// In-process per-recipient soft cap: max 5 web-push sends per minute.
// Acceptable Vercel-function leakage; protects against runaway loops.
const recentSends = new Map<string, number[]>();
function withinSoftCap(recipientLk: string): boolean {
  const now = Date.now();
  const arr = (recentSends.get(recipientLk) ?? []).filter(
    (t) => t > now - 60_000
  );
  if (arr.length >= 5) {
    recentSends.set(recipientLk, arr);
    return false;
  }
  arr.push(now);
  recentSends.set(recipientLk, arr);
  return true;
}

export async function notifyOnSupportMessage(opts: FanOutOpts): Promise<void> {
  if (!isSupabaseServerConfigured) return;
  const supabase = createServerClient();
  if (!supabase) return;

  const conversationLk = opts.message.licenseKey;

  // 1) Determine recipients
  let recipients: Recipient[] = [];
  if (opts.senderIsAdmin) {
    // Admin → conversation owner (skip if internal note)
    if (opts.message.isInternal) return;
    if (conversationLk === opts.senderLicenseKey) return;
    const { data: owner } = await supabase
      .from("license_keys")
      .select("key, name, is_admin")
      .eq("key", conversationLk)
      .maybeSingle();
    if (!owner) return;
    recipients.push({
      lk: owner.key as string,
      name: (owner.name as string) ?? "",
      isAdmin: Boolean(owner.is_admin),
    });
  } else {
    // User → all admins (excluding sender if they happen to be admin)
    const { data: admins } = await supabase
      .from("license_keys")
      .select("key, name")
      .eq("is_admin", true);
    recipients = (admins ?? [])
      .filter((a) => (a.key as string) !== opts.senderLicenseKey)
      .map((a) => ({
        lk: a.key as string,
        name: (a.name as string) ?? "",
        isAdmin: true,
      }));
  }
  if (recipients.length === 0) return;

  const recipientKeys = recipients.map((r) => r.lk);

  // 2) Parallel: mutes, per-recipient settings, push subs
  const [mutesRes, settingsRes, subsRes] = await Promise.all([
    supabase
      .from("support_mutes")
      .select("recipient_lk")
      .in("recipient_lk", recipientKeys)
      .eq("conversation_lk", conversationLk),
    supabase
      .from("user_settings")
      .select(
        "license_key, notif_push_enabled, notif_browser_enabled, notif_sound_enabled, notif_email_enabled"
      )
      .in("license_key", recipientKeys),
    supabase
      .from("push_subscriptions")
      .select("license_key, endpoint, p256dh, auth")
      .in("license_key", recipientKeys)
      .is("revoked_at", null),
  ]);

  const mutedSet = new Set(
    (mutesRes.data ?? []).map((m) => m.recipient_lk as string)
  );
  const settingsMap = new Map<
    string,
    { notif_push_enabled: boolean | null; notif_email_enabled: boolean | null }
  >();
  for (const s of settingsRes.data ?? []) {
    settingsMap.set(s.license_key as string, {
      notif_push_enabled: s.notif_push_enabled as boolean | null,
      notif_email_enabled: s.notif_email_enabled as boolean | null,
    });
  }
  const subsByLk = new Map<string, PushSubLite[]>();
  for (const s of subsRes.data ?? []) {
    const lk = s.license_key as string;
    const arr = subsByLk.get(lk) ?? [];
    arr.push({
      endpoint: s.endpoint as string,
      p256dh: s.p256dh as string,
      auth: s.auth as string,
    });
    subsByLk.set(lk, arr);
  }

  const preview = makePreview(opts.message);

  // 3) For each recipient: insert notification row, then (if push enabled) coalesce + send
  const tasks = recipients.map(async (r) => {
    if (mutedSet.has(r.lk)) return;
    const settings = settingsMap.get(r.lk);

    // 3a) In-app notification (always - drives bell + toast layer)
    await supabase.from("notifications").insert({
      license_key: r.lk,
      type: "support_message",
      sender_name: opts.senderName,
      preview,
      context: "system",
      thread_id: conversationLk,
      message_id: opts.message.id,
      thread_title: opts.senderIsAdmin
        ? "Balasan support"
        : `Support: ${opts.senderName}`,
    });

    // 3b) Web Push (skip if disabled or no subs)
    if (settings?.notif_push_enabled === false) return;
    const subs = subsByLk.get(r.lk) ?? [];
    if (subs.length === 0) return;
    if (!withinSoftCap(r.lk)) return;

    // Coalesce: was a webpush sent for this (recipient, conversation) in the last 30s?
    const sinceIso = new Date(Date.now() - COALESCE_WINDOW_MS).toISOString();
    const { data: recent } = await supabase
      .from("notification_deliveries")
      .select("batch_count, last_pushed_at")
      .eq("recipient_lk", r.lk)
      .eq("conversation_lk", conversationLk)
      .eq("channel", "webpush")
      .gte("last_pushed_at", sinceIso)
      .maybeSingle();
    const batchCount = (recent?.batch_count ?? 0) + 1;
    const body =
      batchCount > 1
        ? `${batchCount} pesan baru dari ${opts.senderName}`
        : preview;

    const deepLink = r.isAdmin
      ? `/admin?tab=7&lk=${conversationLk}`
      : "/support";

    await Promise.allSettled(
      subs.map((s) =>
        sendWebPush(s, {
          title: opts.senderIsAdmin
            ? "Balasan support"
            : `Pesan baru: ${opts.senderName}`,
          body,
          tag: `support:${conversationLk}`,
          data: {
            deepLink,
            conversationLk,
            messageId: opts.message.id,
            kind: "support_message",
          },
        })
      )
    );

    // 3c) Track delivery for next coalesce window
    await supabase
      .from("notification_deliveries")
      .upsert(
        {
          recipient_lk: r.lk,
          conversation_lk: conversationLk,
          channel: "webpush",
          last_message_id: opts.message.id,
          batch_count: batchCount,
          last_pushed_at: new Date().toISOString(),
        },
        { onConflict: "recipient_lk,conversation_lk,channel" }
      );
  });

  await Promise.allSettled(tasks);
}
