import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

const isLiveKitConfigured = !!(
  LIVEKIT_API_KEY &&
  LIVEKIT_API_SECRET &&
  LIVEKIT_URL &&
  !LIVEKIT_API_KEY.includes("TODO")
);

// ─── POST /api/voice/token - Generate LiveKit access token ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, userName, licenseKey } = body;

    if (!roomId || !userName || !licenseKey) {
      return NextResponse.json(
        { error: "roomId, userName, and licenseKey are required" },
        { status: 400 }
      );
    }

    // Validate license key against DB (prevents random-string JWT issuance)
    if (isSupabaseServerConfigured) {
      const supabase = createServerClient()!;
      const { data: license } = await supabase
        .from("license_keys")
        .select("key, suspended_until")
        .eq("key", licenseKey)
        .single();
      if (!license) {
        return NextResponse.json({ error: "Invalid license" }, { status: 401 });
      }
      if (license.suspended_until && new Date(license.suspended_until) > new Date()) {
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
      }
    }

    if (!isLiveKitConfigured) {
      // Return a mock token when LiveKit is not configured
      return NextResponse.json({
        token: null,
        url: null,
        configured: false,
      });
    }

    // Create LiveKit access token
    const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity: licenseKey,
      name: userName,
    });

    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    let token: string;
    try {
      token = await at.toJwt();
    } catch (jwtError) {
      console.error("Failed to generate LiveKit JWT:", jwtError);
      return NextResponse.json(
        { error: "Gagal membuat token audio. Coba lagi nanti." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token,
      url: LIVEKIT_URL,
      configured: true,
    });
  } catch (error) {
    console.error("Voice token error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
