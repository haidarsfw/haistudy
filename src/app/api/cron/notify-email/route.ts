import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { sendBackupEmail } from "@/lib/notifications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/notify-email
 * Vercel cron — every 1 minute. Sends Resend digest to recipients who:
 *  - have an unread `support_message` notification older than 2 min
 *  - have NOT been online in last 5 min
 *  - have not received an email for that (recipient, conv) in last 30 min
 *  - have notif_email_enabled !== false
 *  - have not muted that conversation
 *  - have user_profiles.email present
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ skipped: "supabase not configured" });
  }

  const supabase = createServerClient()!;
  const now = Date.now();
  const olderThan = new Date(now - 2 * 60 * 1000).toISOString();
  const newerThan = new Date(now - 60 * 60 * 1000).toISOString();
  const offlineSince = new Date(now - 5 * 60 * 1000).toISOString();
  const dedupSince = new Date(now - 30 * 60 * 1000).toISOString();

  // 1) Candidate notifications
  const { data: candidates, error: cErr } = await supabase
    .from("notifications")
    .select(
      "id, license_key, sender_name, preview, thread_id, message_id, created_at"
    )
    .eq("type", "support_message")
    .eq("read", false)
    .lte("created_at", olderThan)
    .gte("created_at", newerThan)
    .order("created_at", { ascending: true })
    .limit(200);
  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const recipientKeys = Array.from(
    new Set(candidates.map((c) => c.license_key as string))
  );

  // 2) Bulk fetch related state
  const [presenceRes, settingsRes, profilesRes, mutesRes, deliveriesRes, licensesRes] =
    await Promise.all([
      supabase
        .from("presence")
        .select("license_key, last_seen, online")
        .in("license_key", recipientKeys),
      supabase
        .from("user_settings")
        .select("license_key, notif_email_enabled")
        .in("license_key", recipientKeys),
      supabase
        .from("user_profiles")
        .select("license_key, email")
        .in("license_key", recipientKeys),
      supabase
        .from("support_mutes")
        .select("recipient_lk, conversation_lk")
        .in("recipient_lk", recipientKeys),
      supabase
        .from("notification_deliveries")
        .select("recipient_lk, conversation_lk, last_pushed_at")
        .in("recipient_lk", recipientKeys)
        .eq("channel", "email")
        .gte("last_pushed_at", dedupSince),
      supabase
        .from("license_keys")
        .select("key, name, is_admin")
        .in("key", recipientKeys),
    ]);

  // Recently online recipients (any device with last_seen >= offlineSince)
  const onlineRecent = new Set<string>();
  for (const p of presenceRes.data ?? []) {
    if (
      (p.last_seen as string | null) &&
      (p.last_seen as string) >= offlineSince
    ) {
      onlineRecent.add(p.license_key as string);
    }
  }

  const emailDisabled = new Set<string>();
  for (const s of settingsRes.data ?? []) {
    if ((s.notif_email_enabled as boolean | null) === false) {
      emailDisabled.add(s.license_key as string);
    }
  }

  const emailByLk = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    if (p.email) emailByLk.set(p.license_key as string, p.email as string);
  }

  const muted = new Set<string>();
  for (const m of mutesRes.data ?? []) {
    muted.add(`${m.recipient_lk}::${m.conversation_lk}`);
  }

  const recentDelivered = new Set<string>();
  for (const d of deliveriesRes.data ?? []) {
    recentDelivered.add(`${d.recipient_lk}::${d.conversation_lk}`);
  }

  const licenseInfo = new Map<
    string,
    { name: string; isAdmin: boolean }
  >();
  for (const l of licensesRes.data ?? []) {
    licenseInfo.set(l.key as string, {
      name: (l.name as string) ?? "",
      isAdmin: Boolean(l.is_admin),
    });
  }

  // 3) De-duplicate per (recipient, conversation) — only the LATEST notification
  const byPair = new Map<
    string,
    {
      recipientLk: string;
      conversationLk: string;
      senderName: string;
      preview: string;
    }
  >();
  for (const c of candidates) {
    const recipientLk = c.license_key as string;
    const conversationLk = (c.thread_id as string) || recipientLk;
    const key = `${recipientLk}::${conversationLk}`;
    byPair.set(key, {
      recipientLk,
      conversationLk,
      senderName: (c.sender_name as string) ?? "Support",
      preview: (c.preview as string) ?? "",
    });
  }

  // 4) Send
  let sent = 0;
  let skipped = 0;
  for (const item of byPair.values()) {
    const pairKey = `${item.recipientLk}::${item.conversationLk}`;
    if (onlineRecent.has(item.recipientLk)) {
      skipped++;
      continue;
    }
    if (emailDisabled.has(item.recipientLk)) {
      skipped++;
      continue;
    }
    if (muted.has(pairKey)) {
      skipped++;
      continue;
    }
    if (recentDelivered.has(pairKey)) {
      skipped++;
      continue;
    }
    const to = emailByLk.get(item.recipientLk);
    if (!to) {
      skipped++;
      continue;
    }
    const info = licenseInfo.get(item.recipientLk);
    const res = await sendBackupEmail({
      to,
      recipientName: info?.name || "",
      senderName: item.senderName,
      preview: item.preview,
      conversationLk: item.conversationLk,
      isAdminRecipient: info?.isAdmin ?? false,
    });
    if (res.ok) {
      sent++;
      await supabase.from("notification_deliveries").upsert(
        {
          recipient_lk: item.recipientLk,
          conversation_lk: item.conversationLk,
          channel: "email",
          last_pushed_at: new Date().toISOString(),
          batch_count: 1,
        },
        { onConflict: "recipient_lk,conversation_lk,channel" }
      );
    } else {
      console.warn("[cron.notify-email] send failed", res.error);
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    pairs: byPair.size,
    sent,
    skipped,
    ranAt: new Date().toISOString(),
  });
}
