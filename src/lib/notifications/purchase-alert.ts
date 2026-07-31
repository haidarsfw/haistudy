/**
 * Admin alert fan-out for a new on-site purchase.
 *
 * Push → every admin's registered web-push subscriptions (revoked filtered,
 * endpoints deduped), deep-linking to /admin?tab=5.
 * Email → the union of ADMIN_ALERT_EMAIL (env, comma-separated) and every
 * admin's user_profiles.email (deduped, lowercased) via Resend.
 *
 * Designed to run via `waitUntil` from /api/payments (and the legacy webhook)
 * so the buyer's response returns immediately. Never throws.
 */

import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { sendWebPush, type PushSubLite } from "@/lib/push/send";
import { sendPurchaseAlertEmail } from "@/lib/notifications/email";
import { formatIDR } from "@/lib/payments";
import type { StoredLoginMethod } from "@/lib/auth/login-method";

export interface PurchaseAlertInput {
  requestId?: string | null;
  name: string;
  packageLabel: string;
  uniqueAmount: number;
  scopeLabel: string;
  whatsapp?: string | null;
  loginMethod?: StoredLoginMethod;
}

/** One admin alert mail per this many minutes of wall clock. */
const WINDOW_MINUTES = 30;

/**
 * Is this the first order of the current half-hour block?
 *
 * Derived from `purchase_requests` itself rather than from a marker row, so
 * there is no new table, no migration, and no cron — the Hobby plan has one
 * cron slot left and this does not deserve it.
 *
 * The window is a fixed wall-clock block, not "30 minutes since the last
 * order". A sliding window is the obvious version and it is wrong: orders
 * arriving every 29 minutes would each see the previous one inside the window
 * and suppress forever, so the owner would get exactly one mail and never
 * another. Fixed blocks cap the mail at 48 a day and can never starve.
 *
 * Ties go to sending. If the count cannot be read we send, because the mail
 * exists to tell the owner money arrived and bookkeeping must not be what
 * decides he hears about it.
 */
async function isFirstOrderInWindow(
  supabase: ReturnType<typeof createServerClient>,
  requestId: string | null
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const ms = WINDOW_MINUTES * 60_000;
    const blockStart = new Date(Math.floor(Date.now() / ms) * ms).toISOString();

    let q = supabase
      .from("purchase_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", blockStart);
    // Exclude the order being announced — it is already in the table by now.
    if (requestId) q = q.neq("id", requestId);

    const { count, error } = await q;
    if (error) throw error;
    return (count ?? 0) === 0;
  } catch (e) {
    console.error("[purchase-alert] window check failed, sending anyway", e);
    return true;
  }
}

export async function notifyAdminsOnPurchase(input: PurchaseAlertInput): Promise<void> {
  if (!isSupabaseServerConfigured) return;
  const supabase = createServerClient();
  if (!supabase) return;

  try {
    const amount = formatIDR(input.uniqueAmount);

    // 1) Admin license keys.
    const { data: admins } = await supabase
      .from("license_keys")
      .select("key")
      .eq("is_admin", true);
    const adminKeys = (admins ?? []).map((a) => a.key as string);

    // 2) Push to every admin subscription (dedup endpoints).
    if (adminKeys.length > 0) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("license_key", adminKeys)
        .is("revoked_at", null);

      const seen = new Set<string>();
      const list: PushSubLite[] = [];
      for (const s of subs ?? []) {
        const endpoint = s.endpoint as string;
        if (!endpoint || seen.has(endpoint)) continue;
        seen.add(endpoint);
        list.push({ endpoint, p256dh: s.p256dh as string, auth: s.auth as string });
      }

      if (list.length > 0) {
        await Promise.allSettled(
          list.map((s) =>
            sendWebPush(s, {
              title: "Pembelian baru 🛒",
              body: `${input.name} · ${input.packageLabel} · ${amount}`,
              tag: input.requestId ? `purchase:${input.requestId}` : "purchase",
              data: { deepLink: "/admin?tab=5", kind: "purchase" },
            })
          )
        );
      }
    }

    // 3) Email: ADMIN_ALERT_EMAIL env (comma-separated) + admin profile emails.
    const recipients = new Set<string>();
    const envEmail = process.env.ADMIN_ALERT_EMAIL;
    if (envEmail) {
      for (const e of envEmail.split(",")) {
        const v = e.trim().toLowerCase();
        if (v) recipients.add(v);
      }
    }
    if (adminKeys.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("email")
        .in("license_key", adminKeys);
      for (const p of profiles ?? []) {
        const e = (p.email as string | null)?.trim().toLowerCase();
        if (e) recipients.add(e);
      }
    }

    // 4) Email, but not one per order.
    //
    // Resend's free plan allows 100 mails a DAY (3,000 a month, so the day is
    // the binding one). Each buyer already costs four: confirm, invoice, this
    // alert, and "aksesmu sudah aktif". The busiest day on record is 17 orders
    // — 68 of 100 — and going over does not warn anyone, it just stops sending.
    //
    // Push already fires per order above, instantly, which is the channel that
    // actually gets looked at. So the mail becomes a digest: at most one per
    // QUIET_MINUTES, naming the newest order and how many are waiting behind
    // it. Same information, a quarter of the quota.
    if (
      recipients.size > 0 &&
      (await isFirstOrderInWindow(supabase, input.requestId ?? null))
    ) {
      const { count } = await supabase
        .from("purchase_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      await sendPurchaseAlertEmail({
        to: Array.from(recipients),
        buyerName: input.name,
        packageLabel: input.packageLabel,
        amount,
        scopeLabel: input.scopeLabel,
        whatsapp: input.whatsapp ?? null,
        loginMethod: input.loginMethod ?? null,
        pendingCount: typeof count === "number" ? count : null,
      });
    }
  } catch (e) {
    console.error("[purchase-alert] fan-out failed", e);
  }
}
