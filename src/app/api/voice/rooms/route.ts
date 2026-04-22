import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { VoiceRoom, VoiceParticipant } from "@/types";
import { VOICE_ENABLED, VOICE_DISABLED_MESSAGE } from "@/lib/feature-flags";

// ─── Pre-created rooms (seed data) ───
// UUIDs must match migration 010_fix_presence_voice.sql
const SEED_ROOMS: Omit<VoiceRoom, "participants">[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Study Bareng",
    description: "Belajar bareng, diskusi materi",
    maxParticipants: 10,
    creatorId: null,
    creatorName: null,
    isLocked: false,
    isCustom: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Diskusi Materi",
    description: "Bahas soal dan materi kuliah",
    maxParticipants: 8,
    creatorId: null,
    creatorName: null,
    isLocked: false,
    isCustom: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Chill Zone",
    description: "Ngobrol santai, istirahat sejenak",
    maxParticipants: 6,
    creatorId: null,
    creatorName: null,
    isLocked: false,
    isCustom: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Focus Mode",
    description: "Belajar fokus, minimal obrolan",
    maxParticipants: 4,
    creatorId: null,
    creatorName: null,
    isLocked: false,
    isCustom: false,
  },
];

// In-memory custom rooms (for mock mode)
const customRooms = new Map<string, Omit<VoiceRoom, "participants">>();

// ─── Mock participants ───
const mockParticipants = new Map<string, VoiceParticipant[]>();

function mapParticipantRow(
  row: Record<string, unknown>,
  roleMap?: Map<string, { isAdmin: boolean; isTester: boolean; packageTier: "share" | "normal" | "vip" | "diamond" | null }>
): VoiceParticipant {
  const licenseKey = (row.license_key as string) || null;
  const role = licenseKey ? roleMap?.get(licenseKey) : undefined;
  return {
    id: row.id as string,
    userName: row.user_name as string,
    licenseKey,
    joinedAt: row.joined_at as string,
    isAdmin: role?.isAdmin ?? false,
    isTester: role?.isTester ?? false,
    packageTier: role?.packageTier ?? null,
  };
}

function getAllRoomDefs(): Omit<VoiceRoom, "participants">[] {
  return [...SEED_ROOMS, ...Array.from(customRooms.values())];
}

function findRoom(roomId: string): Omit<VoiceRoom, "participants"> | undefined {
  return SEED_ROOMS.find((r) => r.id === roomId) || customRooms.get(roomId);
}

// Auto-delete custom rooms when empty
function cleanupCustomRoom(roomId: string) {
  const room = customRooms.get(roomId);
  if (!room) return;
  const participants = mockParticipants.get(roomId) || [];
  if (participants.length === 0) {
    customRooms.delete(roomId);
    mockParticipants.delete(roomId);
  }
}

// Lazy-init: ensure seed rooms exist in DB (runs once per server lifecycle)
let seedsEnsured = false;
async function ensureSeedRooms() {
  if (seedsEnsured || !isSupabaseServerConfigured) return;
  seedsEnsured = true;
  try {
    const supabase = createServerClient()!;
    for (const room of SEED_ROOMS) {
      await supabase.from("voice_rooms").upsert(
        {
          id: room.id,
          name: room.name,
          description: room.description,
          max_participants: room.maxParticipants,
          is_custom: false,
        },
        { onConflict: "id" }
      );
    }
  } catch (error) {
    console.error("ensureSeedRooms error:", error);
    seedsEnsured = false; // Retry next request
  }
}

// ─── GET /api/voice/rooms - List all rooms with participants ───
export async function GET() {
  try {
    if (!isSupabaseServerConfigured) {
      const rooms: VoiceRoom[] = getAllRoomDefs().map((r) => ({
        ...r,
        participants: mockParticipants.get(r.id) || [],
      }));
      return NextResponse.json({ rooms });
    }

    await ensureSeedRooms();
    const supabase = createServerClient()!;

    // Clean up stale participants (joined > 10 minutes ago AND not in presence table)
    const STALE_MINUTES = 10;
    const staleThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();
    try {
      // Get participants who joined more than 10min ago
      const { data: staleParticipants } = await supabase
        .from("voice_participants")
        .select("id, license_key, joined_at")
        .lt("joined_at", staleThreshold);

      if (staleParticipants && staleParticipants.length > 0) {
        // Check which of these are still online in presence table
        const licenseKeys = staleParticipants.map((p) => p.license_key).filter(Boolean);
        const { data: onlinePresence } = await supabase
          .from("presence")
          .select("license_key, last_seen")
          .in("license_key", licenseKeys)
          .eq("online", true);

        const recentThreshold = Date.now() - 3 * 60 * 1000; // 3 min
        const onlineKeys = new Set(
          (onlinePresence || [])
            .filter((p) => new Date(p.last_seen as string).getTime() > recentThreshold)
            .map((p) => p.license_key)
        );

        // Delete stale participants who are NOT online
        const toDelete = staleParticipants.filter((p) => !onlineKeys.has(p.license_key));
        if (toDelete.length > 0) {
          await supabase
            .from("voice_participants")
            .delete()
            .in("id", toDelete.map((p) => p.id));
        }
      }
    } catch (cleanupErr) {
      console.error("Voice stale cleanup error:", cleanupErr);
    }

    // Fetch participants grouped by room
    const { data: participants, error } = await supabase
      .from("voice_participants")
      .select("*")
      .order("joined_at", { ascending: true });

    if (error) throw error;

    // Batch-fetch role info for all participants' license_keys (single query)
    const participantKeys = Array.from(
      new Set(
        (participants || [])
          .map((p) => p.license_key as string)
          .filter(Boolean)
      )
    );
    const roleMap = new Map<
      string,
      { isAdmin: boolean; isTester: boolean; packageTier: "share" | "normal" | "vip" | "diamond" | null }
    >();
    if (participantKeys.length > 0) {
      const { data: licenses } = await supabase
        .from("license_keys")
        .select("key, is_admin, is_tester, package_tier")
        .in("key", participantKeys);
      for (const l of licenses || []) {
        roleMap.set(l.key as string, {
          isAdmin: Boolean(l.is_admin),
          isTester: Boolean(l.is_tester),
          packageTier: (l.package_tier as "share" | "normal" | "vip" | "diamond" | null) ?? null,
        });
      }
    }

    const participantsByRoom = new Map<string, VoiceParticipant[]>();
    for (const p of participants || []) {
      const roomId = p.room_id as string;
      if (!participantsByRoom.has(roomId)) {
        participantsByRoom.set(roomId, []);
      }
      participantsByRoom.get(roomId)!.push(mapParticipantRow(p, roleMap));
    }

    const rooms: VoiceRoom[] = getAllRoomDefs().map((r) => ({
      ...r,
      participants: participantsByRoom.get(r.id) || [],
    }));

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Voice rooms GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/voice/rooms - Join, leave, create, lock, unlock ───
export async function POST(request: Request) {
  try {
    if (!VOICE_ENABLED) {
      return NextResponse.json(
        { error: VOICE_DISABLED_MESSAGE },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 }
      );
    }

    // ── Create custom room ──
    if (action === "create") {
      const { name, maxParticipants = 8, creatorId, creatorName } = body;
      if (!name?.trim() || !creatorId || !creatorName) {
        return NextResponse.json(
          { error: "name, creatorId, and creatorName are required" },
          { status: 400 }
        );
      }

      // Validate creatorId against DB (prevents spam room creation with fake IDs)
      if (isSupabaseServerConfigured) {
        const supabase = createServerClient()!;
        const { data: license } = await supabase
          .from("license_keys")
          .select("key, suspended_until")
          .eq("key", creatorId)
          .single();
        if (!license) {
          return NextResponse.json({ error: "Invalid creator license" }, { status: 401 });
        }
        if (license.suspended_until && new Date(license.suspended_until) > new Date()) {
          return NextResponse.json({ error: "Account suspended" }, { status: 403 });
        }
      }

      const id = crypto.randomUUID();
      const newRoom: Omit<VoiceRoom, "participants"> = {
        id,
        name: name.trim().slice(0, 30),
        description: `Room oleh ${creatorName}`,
        maxParticipants: Math.min(Math.max(maxParticipants, 2), 20),
        creatorId,
        creatorName,
        isLocked: false,
        isCustom: true,
      };
      customRooms.set(id, newRoom);

      // Persist to DB so FK constraint works for voice_participants
      if (isSupabaseServerConfigured) {
        const supabase = createServerClient()!;
        await supabase.from("voice_rooms").insert({
          id,
          name: newRoom.name,
          description: newRoom.description,
          max_participants: newRoom.maxParticipants,
          creator_id: creatorId,
          creator_name: creatorName,
          is_custom: true,
        });
      }

      return NextResponse.json({ success: true, room: { ...newRoom, participants: [] } });
    }

    const { roomId, userName, licenseKey } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: "roomId is required" },
        { status: 400 }
      );
    }

    const room = findRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // ── Update room settings (creator only) ──
    if (action === "update") {
      if (!licenseKey) {
        return NextResponse.json({ error: "licenseKey is required" }, { status: 400 });
      }
      if (room.creatorId !== licenseKey) {
        return NextResponse.json({ error: "Only the room creator can update settings" }, { status: 403 });
      }
      if (room.isCustom) {
        const updates: Partial<Omit<VoiceRoom, "participants">> = {};
        if (body.maxParticipants !== undefined) {
          updates.maxParticipants = Math.min(Math.max(body.maxParticipants, 2), 20);
        }
        if (body.isLocked !== undefined) {
          updates.isLocked = body.isLocked;
        }
        customRooms.set(roomId, { ...room, ...updates });
      }
      return NextResponse.json({ success: true });
    }

    // ── Delete custom room (creator only) ──
    if (action === "delete") {
      if (!licenseKey) {
        return NextResponse.json({ error: "licenseKey is required" }, { status: 400 });
      }
      if (!room.isCustom) {
        return NextResponse.json({ error: "Cannot delete seed rooms" }, { status: 403 });
      }
      if (room.creatorId !== licenseKey) {
        return NextResponse.json({ error: "Only the room creator can delete" }, { status: 403 });
      }
      customRooms.delete(roomId);
      mockParticipants.delete(roomId);
      return NextResponse.json({ success: true });
    }

    // ── Lock / Unlock ──
    if (action === "lock" || action === "unlock") {
      if (!licenseKey) {
        return NextResponse.json(
          { error: "licenseKey is required" },
          { status: 400 }
        );
      }
      if (room.creatorId !== licenseKey) {
        return NextResponse.json(
          { error: "Only the room creator can lock/unlock" },
          { status: 403 }
        );
      }
      // Update the room's lock state
      if (room.isCustom) {
        customRooms.set(roomId, { ...room, isLocked: action === "lock" });
      }
      return NextResponse.json({ success: true });
    }

    // ── Join ──
    if (action === "join") {
      if (!userName || !licenseKey) {
        return NextResponse.json(
          { error: "userName and licenseKey are required for join" },
          { status: 400 }
        );
      }

      // Check if room is locked
      if (room.isLocked && room.creatorId !== licenseKey) {
        return NextResponse.json(
          { error: "Room is locked" },
          { status: 403 }
        );
      }

      if (!isSupabaseServerConfigured) {
        // Remove from any other room first
        for (const [rid, participants] of mockParticipants.entries()) {
          if (rid !== roomId) {
            const filtered = participants.filter((p) => p.licenseKey !== licenseKey);
            if (filtered.length !== participants.length) {
              mockParticipants.set(rid, filtered);
              // Cleanup custom room if now empty
              cleanupCustomRoom(rid);
            }
          }
        }

        const existing = mockParticipants.get(roomId) || [];
        // Check if already in room
        if (existing.some((p) => p.licenseKey === licenseKey)) {
          return NextResponse.json({ success: true });
        }
        // Check max participants
        if (existing.length >= room.maxParticipants) {
          return NextResponse.json(
            { error: "Room is full" },
            { status: 409 }
          );
        }
        const participant: VoiceParticipant = {
          id: crypto.randomUUID(),
          userName,
          licenseKey,
          joinedAt: new Date().toISOString(),
        };
        mockParticipants.set(roomId, [...existing, participant]);
        return NextResponse.json({ success: true, participant });
      }

      const supabase = createServerClient()!;

      // Remove from any other room first (non-critical - log and continue)
      try {
        await supabase
          .from("voice_participants")
          .delete()
          .eq("license_key", licenseKey);
      } catch (cleanupError) {
        console.error("Non-critical: failed to remove from other rooms:", cleanupError);
      }

      // Check participant count
      const { count } = await supabase
        .from("voice_participants")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId);

      if (count !== null && count >= room.maxParticipants) {
        return NextResponse.json(
          { error: "Room is full" },
          { status: 409 }
        );
      }

      // Insert participant (delete already cleared old entries above)
      const { data, error } = await supabase
        .from("voice_participants")
        .insert({
          room_id: roomId,
          user_name: userName,
          license_key: licenseKey,
        })
        .select()
        .single();

      if (error) {
        console.error("Insert participant error:", error);
        return NextResponse.json(
          { error: "Gagal menambahkan peserta ke room" },
          { status: 500 }
        );
      }

      // Post-insert overflow check: guard against concurrent joins exceeding max
      const { count: newCount } = await supabase
        .from("voice_participants")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId);

      if (newCount !== null && newCount > room.maxParticipants) {
        // We caused overflow — remove ourselves
        await supabase
          .from("voice_participants")
          .delete()
          .eq("id", data.id);
        return NextResponse.json(
          { error: "Room is full" },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        participant: mapParticipantRow(data),
      });
    }

    // ── Leave ──
    if (action === "leave") {
      if (!licenseKey) {
        return NextResponse.json(
          { error: "licenseKey is required for leave" },
          { status: 400 }
        );
      }

      if (!isSupabaseServerConfigured) {
        const existing = mockParticipants.get(roomId) || [];
        mockParticipants.set(
          roomId,
          existing.filter((p) => p.licenseKey !== licenseKey)
        );
        // Auto-delete custom room if empty
        cleanupCustomRoom(roomId);
        return NextResponse.json({ success: true });
      }

      const supabase = createServerClient()!;
      const { error } = await supabase
        .from("voice_participants")
        .delete()
        .eq("room_id", roomId)
        .eq("license_key", licenseKey);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Voice rooms POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
