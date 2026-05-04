import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { sendWebPush } from "@/lib/push/send";

export const runtime = "nodejs";

/** Send a test push to all of the current user's subscriptions. */
export async function POST() {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get("hs-session")?.value;
  if (!licenseKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = createServerClient()!;
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("license_key", licenseKey)
    .is("revoked_at", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: false, reason: "no subscriptions" });
  }

  const results = await Promise.all(
    subs.map((s) =>
      sendWebPush(
        {
          endpoint: s.endpoint as string,
          p256dh: s.p256dh as string,
          auth: s.auth as string,
        },
        {
          title: "haistudy",
          body: "Notifikasi berfungsi! 🎉 Pesan support akan muncul seperti ini.",
          tag: "support:test",
          data: { deepLink: "/dashboard", kind: "test" },
        }
      )
    )
  );
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.ok).length,
    total: results.length,
  });
}
