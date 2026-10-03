import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { accountIdForLicense } from "@/lib/auth/account-link";
import { GROUP_COLUMNS, activeMemberCount, type GroupRow } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";

type ViewerState = "none" | "pending" | "invited" | "member" | "declined" | "self";

/**
 * GET /api/mentor/by-license?licenseKey=XXXXX
 *
 * The groups a mentor runs in the period the viewer has open, and where the
 * viewer stands in each. For the profile popover: a mentee who sees the Mentor
 * badge in chat can ask to join from there (entry path #3).
 *
 * Only this period's groups: a semester-3 mentor's group for semester 1 means
 * nothing to someone reading the semester-2 chat. Called only when a mentor's
 * popover opens, never for the avatar batch.
 */
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const key = (new URL(request.url).searchParams.get("licenseKey") || "").trim().toUpperCase();
    if (!isSupabaseServerConfigured || !/^[A-Z0-9-]{4,16}$/.test(key)) {
      return NextResponse.json({ groups: [], canRequest: false });
    }
    const supabase = createServerClient()!;
    const mentorId = await accountIdForLicense(supabase, key);
    if (!mentorId) return NextResponse.json({ groups: [], canRequest: false });

    const [{ data: owned }, { data: co }] = await Promise.all([
      supabase
        .from("mentor_groups")
        .select(GROUP_COLUMNS)
        .eq("owner_account_id", mentorId)
        .eq("status", "active")
        .eq("semester", scope.semester)
        .eq("exam_period", scope.examPeriod)
        .eq("jurusan", scope.jurusan),
      supabase
        .from("group_members")
        .select("group_id")
        .eq("account_id", mentorId)
        .eq("role", "mentor")
        .eq("status", "active"),
    ]);
    const byId = new Map<string, GroupRow>();
    for (const g of (owned ?? []) as GroupRow[]) byId.set(g.id, g);
    const coIds = (co ?? []).map((r) => r.group_id as string).filter((id) => !byId.has(id));
    if (coIds.length) {
      const { data: led } = await supabase
        .from("mentor_groups")
        .select(GROUP_COLUMNS)
        .in("id", coIds)
        .eq("status", "active")
        .eq("semester", scope.semester)
        .eq("exam_period", scope.examPeriod)
        .eq("jurusan", scope.jurusan);
      for (const g of (led ?? []) as GroupRow[]) byId.set(g.id, g);
    }
    const groups = [...byId.values()];
    if (!groups.length) return NextResponse.json({ groups: [], canRequest: false });

    const viewer = await requestingAccountId(supabase);
    const ids = groups.map((g) => g.id);
    const { data: mine } = viewer
      ? await supabase
          .from("group_members")
          .select("group_id, status, role")
          .eq("account_id", viewer)
          .in("group_id", ids)
      : { data: [] };
    const mineBy = new Map((mine ?? []).map((m) => [m.group_id as string, m]));

    const out = await Promise.all(
      groups.map(async (g) => {
        const m = mineBy.get(g.id);
        let state: ViewerState = "none";
        if (viewer && (g.owner_account_id === viewer || (m?.role === "mentor" && m.status === "active"))) {
          state = "self";
        } else if (m?.status === "active") state = "member";
        else if (m?.status === "pending" || m?.status === "invited" || m?.status === "declined") {
          state = m.status;
        }
        return {
          id: g.id,
          name: g.name,
          members: await activeMemberCount(supabase, g.id),
          maxMembers: g.max_members,
          state,
        };
      })
    );
    return NextResponse.json({ groups: out, canRequest: Boolean(viewer) });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mentor/by-license] gagal:", error);
    return NextResponse.json({ groups: [], canRequest: false });
  }
}
