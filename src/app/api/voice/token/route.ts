import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { VOICE_ENABLED, VOICE_DISABLED_MESSAGE } from "@/lib/feature-flags";
import { requireScope, ScopeError, assertNotPreview } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";

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

    // Cohort shutdown - short-circuit before LiveKit token issuance.
    if (!VOICE_ENABLED) {
      return NextResponse.json(
        { error: VOICE_DISABLED_MESSAGE },
        { status: 503 }
      );
    }

    // Scope enforcement
    const scope = await requireScope(request);
    await assertNotPreview();

    // Validate license key against DB (prevents random-string JWT issuance).
    // Identity lookup is scope-agnostic: a key's (semester, exam_period, jurusan)
    // columns bind it to ONE scope, but admins (and anyone) can switch session
    // scope freely, so filtering by scope here would 401 a valid user in a scope
    // their key wasn't created in. Scope is still enforced by requireScope
    // (cookie) and the LiveKit room is scope-prefixed via scopedRoomId. Mirrors
    // the AI route + the create/join handlers, which validate without scope.
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
      if ((license as Record<string, unknown>).suspended_until && new Date((license as Record<string, unknown>).suspended_until as string) > new Date()) {
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

    // LiveKit room name prefixed by scope to isolate audio across scopes
    const scopedRoomId = `${scopeKey(scope)}:${roomId}`;

    at.addGrant({
      room: scopedRoomId,
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
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Voice token error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
