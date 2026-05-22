import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

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
  semester: number;
  examPeriod: "uts" | "uas";
  jurusan: string;
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
    semester: 2,
    examPeriod: "uts",
    jurusan: "bm",
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
    semester: 2,
    examPeriod: "uts",
    jurusan: "bm",
  },
];

// ─── GET /api/admin/users?scope=KEY|allPeriods=1 ───
export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolved = await resolveAdminScope(request);

    if (!isSupabaseServerConfigured) {
      let users = mockUsers;
      if (resolved.mode === "scoped") {
        users = users.filter(
          (u) =>
            u.semester === resolved.scope.semester &&
            u.examPeriod === resolved.scope.examPeriod &&
            u.jurusan === resolved.scope.jurusan
        );
      }
      return NextResponse.json({ users });
    }

    const supabase = createServerClient()!;

    // Join license_keys with activations to get user info; scope filter via license_keys.
    let q = supabase
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
          suspended_until,
          semester,
          exam_period,
          jurusan
        )
      `)
      .order("activated_at", { ascending: false });

    if (resolved.mode === "scoped") {
      q = q
        .eq("license_keys.semester", resolved.scope.semester)
        .eq("license_keys.exam_period", resolved.scope.examPeriod)
        .eq("license_keys.jurusan", resolved.scope.jurusan);
    }

    const { data, error } = await q;

    if (error) throw error;

    // Get device counts for ALL activations in result set
    const activationIds = (data || []).map((d) => d.id as string);
    const deviceCountMap = new Map<string, number>();
    if (activationIds.length > 0) {
      const { data: deviceCounts } = await supabase
        .from("devices")
        .select("activation_id")
        .in("activation_id", activationIds);
      if (deviceCounts) {
        for (const d of deviceCounts) {
          const aid = d.activation_id as string;
          deviceCountMap.set(aid, (deviceCountMap.get(aid) || 0) + 1);
        }
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
        semester: (lk.semester as number) ?? 2,
        examPeriod: (lk.exam_period as "uts" | "uas") ?? "uts",
        jurusan: (lk.jurusan as string) ?? "bm",
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
