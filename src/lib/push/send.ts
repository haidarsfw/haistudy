/**
 * Server-side Web Push sender.
 * Uses VAPID keys from env. Fire-and-forget on failure but always handles 410/404
 * (subscription gone) by marking the row revoked so we stop trying.
 *
 * Node runtime only — `web-push` is a Node package and won't run on Edge.
 */

import webpush, { type PushSubscription, type SendResult } from "web-push";
import { createServerClient } from "@/lib/supabase/server";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:noreply@haistudy.site";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
  return true;
}

export interface PushSubLite {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export async function sendWebPush(
  sub: PushSubLite,
  payload: PushPayload
): Promise<{ ok: boolean; statusCode?: number }> {
  if (!ensureConfigured()) {
    return { ok: false };
  }

  // Web Push payload limit is 4 KB — truncate body to a safe length.
  const safePayload = {
    title: payload.title.slice(0, 80),
    body: payload.body.slice(0, 100),
    tag: payload.tag,
    data: payload.data ?? {},
  };

  const target: PushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    const result: SendResult = await webpush.sendNotification(
      target,
      JSON.stringify(safePayload),
      { TTL: 60 * 60, urgency: "high" }
    );
    return { ok: true, statusCode: result.statusCode };
  } catch (e) {
    const err = e as { statusCode?: number; body?: string };
    const status = err.statusCode ?? 0;
    if (status === 404 || status === 410) {
      // Endpoint gone — mark revoked so we stop sending.
      const supabase = createServerClient();
      if (supabase) {
        await supabase
          .from("push_subscriptions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("endpoint", sub.endpoint);
      }
    } else {
      console.error("[push.send] error", status, err.body);
    }
    return { ok: false, statusCode: status };
  }
}
