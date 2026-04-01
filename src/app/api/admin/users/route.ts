import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";

// ─── Mock data ───
interface UserRow {
  licenseKey: string;
  name: string;
  userName: string;
  email: string | null;
  expiry: string | null;
  isAdmin: boolean;
  isTester: boolean;
  totalQuizScore: number;
  totalOnlineMinutes: number;
  deviceCount: number;
  activatedAt: string;
  suspendedUntil: string | null;
}

const mockUsers: UserRow[] = [
  {
    licenseKey: "B29-ABC123",
    name: "Budi Santoso",
    userName: "Budi Santoso",
    email: "budi@binus.ac.id",
    expiry: null,
    isAdmin: false,
    isTester: false,
    totalQuizScore: 320,
    totalOnlineMinutes: 450,
    deviceCount: 1,
    activatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    suspendedUntil: null,
  },
  {
    licenseKey: "B29-DEF456",
    name: "Siti Rahayu",
    userName: "Siti Rahayu",
    email: null,
    expiry: null,
    isAdmin: false,
    isTester: false,
    totalQuizScore: 280,
    totalOnlineMinutes: 300,
    deviceCount: 2,
    activatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    suspendedUntil: null,
  },
];

// ─── GET /api/admin/users ───
export async function GET() {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ users: mockUsers });
    }

    const supabase = createServerClient()!;

    // Join license_keys with activations to get user info
    const { data, error } = await supabase
      .from("activations")
      .select(`
        id,
        license_key,
        user_name,
        email,
        expiry,
        activated_at,
        license_keys!inner (
          key,
          name,
          is_admin,
          is_tester,
          total_quiz_score,
          total_online_minutes,
          suspended_until
        )
      `)
      .order("activated_at", { ascending: false });

    if (error) throw error;

    // Get device counts
    const { data: deviceCounts } = await supabase
      .from("devices")
      .select("activation_id");

    const deviceCountMap = new Map<string, number>();
    if (deviceCounts) {
      for (const d of deviceCounts) {
        const aid = d.activation_id as string;
        deviceCountMap.set(aid, (deviceCountMap.get(aid) || 0) + 1);
      }
    }

    const users: UserRow[] = (data || []).map((row) => {
      const lk = row.license_keys as unknown as Record<string, unknown>;
      return {
        licenseKey: row.license_key,
        name: lk.name as string,
        userName: row.user_name,
        email: row.email,
        expiry: row.expiry,
        isAdmin: lk.is_admin as boolean,
        isTester: lk.is_tester as boolean,
        totalQuizScore: (lk.total_quiz_score as number) || 0,
        totalOnlineMinutes: (lk.total_online_minutes as number) || 0,
        deviceCount: deviceCountMap.get(row.id) || 0,
        activatedAt: row.activated_at,
        suspendedUntil: (lk.suspended_until as string) || null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
