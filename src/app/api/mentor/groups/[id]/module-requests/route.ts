import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { GROUP_COLUMNS, roleInGroup, toMentorGroup, type GroupRow } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import { loadCourses } from "@/data";
import type { AgendaItem } from "@/lib/mentor/sessions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET — what the group's members marked "mau dibahas", per module, most asked
 * first: the mentor's input for the next agenda. Mentors only.
 *
 * Each module says whether an upcoming session already has it on the agenda,
 * so the list doubles as "what is still waiting".
 *
 * scope-exempt: the group's own period, read from the group row.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ requests: [] });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (role !== "mentor") return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

    const { data: g } = await supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).single();
    const group = toMentorGroup(g as GroupRow);

    const { data: members } = await supabase
      .from("group_members")
      .select("account_id")
      .eq("group_id", id)
      .eq("status", "active")
      .eq("role", "member");
    const ids = (members ?? []).map((m) => m.account_id as string);
    if (!ids.length) return NextResponse.json({ requests: [] });

    const [{ data: marks }, { data: sessions }, names, courses] = await Promise.all([
      supabase
        .from("module_marks")
        .select("account_id, subject_id, module_id, module_title")
        .in("account_id", ids)
        .eq("status", "want")
        .eq("semester", group.scope.semester)
        .eq("exam_period", group.scope.examPeriod)
        .eq("jurusan", group.scope.jurusan),
      supabase
        .from("group_sessions")
        .select("agenda, starts_at")
        .eq("group_id", id)
        .eq("status", "scheduled")
        .gte("starts_at", new Date(Date.now() - 3 * 3600_000).toISOString()),
      displayNamesForAccounts(supabase, ids),
      loadCourses(group.scope).catch(() => []),
    ]);

    const scheduled = new Set<string>();
    for (const s of sessions ?? []) {
      for (const a of (s.agenda ?? []) as AgendaItem[]) {
        if (a.subjectId && a.module) scheduled.add(`${a.subjectId}/${a.module}`);
      }
    }
    const subjectName = new Map(courses.map((c) => [c.id, c.name]));
    const byModule = new Map<
      string,
      { subjectId: string; subjectName: string; moduleId: string; moduleTitle: string; names: string[] }
    >();
    for (const m of marks ?? []) {
      const key = `${m.subject_id}/${m.module_id}`;
      const row =
        byModule.get(key) ??
        {
          subjectId: m.subject_id as string,
          subjectName: subjectName.get(m.subject_id as string) ?? (m.subject_id as string),
          moduleId: m.module_id as string,
          moduleTitle: (m.module_title as string) || (m.module_id as string),
          names: [],
        };
      row.names.push(names.get(m.account_id as string) ?? "Pengguna");
      byModule.set(key, row);
    }

    const requests = [...byModule.entries()]
      .map(([key, r]) => ({ ...r, count: r.names.length, scheduled: scheduled.has(key) }))
      .sort((a, b) => Number(a.scheduled) - Number(b.scheduled) || b.count - a.count);
    return NextResponse.json({ requests });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/module-requests] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
