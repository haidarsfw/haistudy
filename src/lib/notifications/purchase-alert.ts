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

    if (recipients.size > 0) {
      await sendPurchaseAlertEmail({
        to: Array.from(recipients),
        buyerName: input.name,
        packageLabel: input.packageLabel,
        amount,
        scopeLabel: input.scopeLabel,
        whatsapp: input.whatsapp ?? null,
        loginMethod: input.loginMethod ?? null,
      });
    }
  } catch (e) {
    console.error("[purchase-alert] fan-out failed", e);
  }
}
