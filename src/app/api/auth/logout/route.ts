import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

/**
 * POST /api/auth/logout
 * Clears session cookies and cleans up presence.
 * Accepts both licenseKey and deviceId for accurate presence cleanup.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { licenseKey, deviceId } = body as {
      licenseKey?: string;
      deviceId?: string;
    };

    // Clean up presence in Supabase
    if (isSupabaseServerConfigured && licenseKey) {
      const supabase = createServerClient()!;

      // Flush remaining accumulated seconds before going offline
      if (deviceId) {
        // Preferred: use deviceId (matches presence row's user_id)
        const { data: presenceRow } = await supabase
          .from("presence")
          .select("online_seconds_accumulator")
          .eq("user_id", deviceId)
          .single();

        if (presenceRow) {
          const accum = presenceRow.online_seconds_accumulator || 0;
          const fullMinutes = Math.floor(accum / 60);

          // Flush accumulated minutes to license_keys before going offline
          if (fullMinutes > 0) {
            try {
              await supabase.rpc("increment_license_field", {
                p_key: licenseKey,
                p_field: "total_online_minutes",
                p_amount: fullMinutes,
              });
            } catch {
              // Non-critical - best effort
            }
          }

          await supabase
            .from("presence")
            .update({
              online: false,
              last_seen: new Date().toISOString(),
              online_seconds_accumulator: 0,
            })
            .eq("user_id", deviceId);
        }
      } else {
        // Fallback: use licenseKey (backward compat, less precise)
        await supabase
          .from("presence")
          .update({
            online: false,
            last_seen: new Date().toISOString(),
            online_seconds_accumulator: 0,
          })
          .eq("license_key", licenseKey);
      }
    }

    // Sign out from Supabase Auth too (clears sb-* cookies for OAuth users)
    try {
      const authClient = await createServerAuthClient();
      if (authClient) {
        await authClient.auth.signOut();
      }
    } catch {
      /* non-critical */
    }

    const response = NextResponse.json({ success: true });

    const clearOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };

    // Clear session cookies
    response.cookies.set("hs-session", "", clearOpts);
    response.cookies.set("hs-admin", "", clearOpts);
    response.cookies.set("hs-scope", "", clearOpts);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear cookies even on error
    const response = NextResponse.json({ success: true });
    response.cookies.set("hs-session", "", { path: "/", maxAge: 0 });
    response.cookies.set("hs-admin", "", { path: "/", maxAge: 0 });
    response.cookies.set("hs-scope", "", { path: "/", maxAge: 0 });
    return response;
  }
}
