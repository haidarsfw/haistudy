import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScopeTuple } from "@/types/scope";

/**
 * Central helper for writing admin Activity Logs.
 *
 * One insert per call into `activity_logs` (action is free-text — no migration).
 * ALWAYS fire-and-forget-safe: a logging failure must never break the caller's
 * real work, so every insert is wrapped in try/catch and swallows errors.
 *
 * Only wire this at LOW-frequency, high-value events (logins, logouts, purchases,
 * admin actions, downloads). Never inside hot paths (chat, forum, quiz, presence)
 * — each call is a DB write and the project runs on the Supabase/Vercel free tier.
 */

export function deviceTypeFromUA(ua: string): "mobile" | "desktop" {
  return /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : "desktop";
}

export function deviceLabelFromUA(ua: string): string {
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface ActivityEntry {
  /** Free-text action key, e.g. "logout", "purchase_request", "exam_regrade". */
  action: string;
  /** Display name; falls back to "System" (column is NOT NULL). */
  userName?: string | null;
  details?: string | null;
  ip?: string | null;
  deviceType?: string | null;
  deviceLabel?: string | null;
  /** Scope tuple — denormalized into semester/exam_period/jurusan columns. */
  scope?: ScopeTuple | null;
}

/**
 * Insert one activity_logs row. Never throws.
 * `supabase` must be a service-role server client (writes bypass RLS).
 */
export async function recordActivity(
  supabase: SupabaseClient,
  entry: ActivityEntry
): Promise<void> {
  try {
    await supabase.from("activity_logs").insert({
      user_name: entry.userName?.trim() || "System",
      action: entry.action,
      details: entry.details ?? null,
      ip_address: entry.ip ?? null,
      device_type: entry.deviceType ?? null,
      device_label: entry.deviceLabel ?? null,
      ...(entry.scope
        ? {
            semester: entry.scope.semester,
            exam_period: entry.scope.examPeriod,
            jurusan: entry.scope.jurusan,
          }
        : {}),
    });
  } catch {
    /* logging must never break the caller */
  }
}
