import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

/**
 * POST /api/auth/logout
 * Clears session cookies and optionally cleans up presence.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const licenseKey = (body as { licenseKey?: string }).licenseKey;

    // Clean up presence in Supabase
    if (isSupabaseServerConfigured && licenseKey) {
      const supabase = createServerClient()!;
      await supabase
        .from("presence")
        .update({ online: false, last_seen: new Date().toISOString() })
        .eq("license_key", licenseKey);
    }

    const response = NextResponse.json({ success: true });

    // Clear session cookies
    response.cookies.set("hs-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set("hs-admin", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear cookies even on error
    const response = NextResponse.json({ success: true });
    response.cookies.set("hs-session", "", { path: "/", maxAge: 0 });
    response.cookies.set("hs-admin", "", { path: "/", maxAge: 0 });
    return response;
  }
}
