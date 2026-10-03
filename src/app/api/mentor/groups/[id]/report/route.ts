import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { GROUP_COLUMNS, roleInGroup, toMentorGroup, type GroupRow } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import { memberProgress } from "@/lib/mentor/progress";
import { moduleIdOf } from "@/lib/mentor/modules";
import type { AgendaItem } from "@/lib/mentor/sessions";
import { loadCourses, loadRangkuman } from "@/data";
import { scopeFullLabel } from "@/lib/scope";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET — the program report of one group: what was held, who came, what the
 * sessions covered, and where each member stands, worked out at the moment
 * it is opened. For the group's mentor and for the owner (admin panel).
 *
 * Attendance is counted per member over the sessions held after they joined
 * (someone who joined in week 5 did not miss weeks 1 to 4), plus any session
 * the mentor recorded them at.
 *
 * scope-exempt: the group's own period, read from the group row. Identity
 * from the account (mentor) or the admin licence.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    const supabase = createServerClient()!;

    const accountId = await requestingAccountId(supabase);
    const isMentor = accountId ? (await roleInGroup(supabase, id, accountId)) === "mentor" : false;
    if (!isMentor && !(await validateAdmin()).authorized) {
      return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    }

    const { data: g } = await supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).maybeSingle();
    if (!g) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    const group = toMentorGroup(g as GroupRow);

    const [{ data: sessionRows }, { data: memberRows }, { data: questionRows }, { count: commentCount }] =
      await Promise.all([
        supabase
          .from("group_sessions")
          .select("id, title, starts_at, duration_minutes, status, agenda")
          .eq("group_id", id)
          .order("starts_at", { ascending: true }),
        supabase.from("group_members").select("account_id, role, status, joined_at").eq("group_id", id),
        supabase
          .from("group_messages")
          .select("account_id, answered_at")
          .eq("group_id", id)
          .eq("is_question", true)
          .eq("deleted", false),
        supabase
          .from("material_comments")
          .select("id", { head: true, count: "exact" })
          .eq("group_id", id)
          .is("parent_id", null)
          .eq("deleted", false),
      ]);

    const now = Date.now();
    const sessions = (sessionRows ?? []).map((s) => ({
      id: s.id as string,
      title: s.title as string,
      startsAt: s.starts_at as string,
      durationMinutes: s.duration_minutes as number,
      status: s.status as string,
      agenda: (Array.isArray(s.agenda) ? s.agenda : []) as AgendaItem[],
    }));
    const endOf = (s: { startsAt: string; durationMinutes: number }) =>
      Date.parse(s.startsAt) + s.durationMinutes * 60_000;
    const held = sessions.filter((s) => s.status === "done");
    const heldIds = held.map((s) => s.id);

    const { data: attendance } = heldIds.length
      ? await supabase.from("session_attendance").select("session_id, account_id, attended").in("session_id", heldIds)
      : { data: [] as { session_id: string; account_id: string; attended: boolean | null }[] };
    const presentAt = (sid: string, acc: string) =>
      (attendance ?? []).some((a) => a.session_id === sid && a.account_id === acc && a.attended === true);
    const recordedAt = (sid: string, acc: string) =>
      (attendance ?? []).some((a) => a.session_id === sid && a.account_id === acc && a.attended !== null);

    const members = (memberRows ?? []).filter((m) => m.role === "member" && m.status === "active");
    const joinedAt = new Map(members.map((m) => [m.account_id as string, (m.joined_at as string | null) ?? null]));
    // A session counts for someone if they had joined by its end, or if the
    // mentor recorded them at it: leaving and coming back resets joined_at,
    // and must not erase the sessions they did attend.
    const eligible = (s: { id: string; startsAt: string; durationMinutes: number }, acc: string) => {
      const j = joinedAt.get(acc);
      return !j || Date.parse(j) <= endOf(s) || recordedAt(s.id, acc);
    };
    const memberIds = members.map((m) => m.account_id as string);
    const owner = group.ownerAccountId;

    const [progress, names, courses, rangkuman] = await Promise.all([
      memberProgress(supabase, group, memberIds),
      displayNamesForAccounts(supabase, [owner]),
      loadCourses(group.scope).catch(() => []),
      loadRangkuman(group.scope).catch(() => null),
    ]);

    // What the held sessions covered, against every module the period has.
    const modulesBySubject = (rangkuman ?? {}) as Record<string, Record<string, string>>;
    const totalModules = Object.values(modulesBySubject).reduce((n, m) => n + Object.keys(m ?? {}).length, 0);
    const subjectName = new Map(courses.map((c) => [c.id, c.name]));
    const covered = new Map<string, { subject: string; module: string; session: string; date: string }>();
    for (const s of held) {
      for (const a of s.agenda) {
        if (!a.subjectId || !a.module) continue;
        const key = `${a.subjectId}/${a.module}`;
        if (covered.has(key)) continue;
        const title =
          Object.keys(modulesBySubject[a.subjectId] ?? {}).find((t) => moduleIdOf(t) === a.module) ?? a.module;
        covered.set(key, {
          subject: subjectName.get(a.subjectId) ?? a.subjectId,
          module: title,
          session: s.title,
          date: s.startsAt,
        });
      }
    }

    const questions = questionRows ?? [];
    const progressOf = new Map(progress.map((p) => [p.accountId, p]));

    return NextResponse.json({
      generatedAt: new Date(now).toISOString(),
      group: {
        id: group.id,
        name: group.name,
        period: scopeFullLabel(group.scope),
        status: group.status,
        createdAt: group.createdAt,
        mentor: names.get(owner) ?? "Mentor",
      },
      sessions: {
        held: held.length,
        cancelled: sessions.filter((s) => s.status === "cancelled").length,
        upcoming: sessions.filter((s) => s.status === "scheduled" && endOf(s) > now).length,
        // Over, but never closed with notes: worth a nudge to the mentor.
        unclosed: sessions.filter((s) => s.status === "scheduled" && endOf(s) <= now).length,
        hours: Math.round((held.reduce((n, s) => n + s.durationMinutes, 0) / 60) * 10) / 10,
        list: held.map((s) => {
          const counted = memberIds.filter((acc) => eligible(s, acc));
          return {
            id: s.id,
            title: s.title,
            startsAt: s.startsAt,
            durationMinutes: s.durationMinutes,
            present: counted.filter((acc) => presentAt(s.id, acc)).length,
            of: counted.length,
          };
        }),
      },
      coverage: {
        covered: covered.size,
        total: totalModules,
        modules: [...covered.values()].sort((a, b) => a.date.localeCompare(b.date)),
      },
      questions: { asked: questions.length, answered: questions.filter((q) => q.answered_at).length },
      comments: commentCount ?? 0,
      left: (memberRows ?? []).filter((m) => m.role === "member" && m.status === "left").length,
      members: memberIds
        .map((acc) => {
          const p = progressOf.get(acc);
          const mine = held.filter((s) => eligible(s, acc));
          return {
            accountId: acc,
            name: p?.name ?? "Pengguna",
            joinedAt: joinedAt.get(acc) ?? null,
            hasAccess: p?.hasAccess ?? false,
            overall: p?.overall ?? 0,
            exam: p?.exam ?? { attempts: 0, avgScore: null },
            wants: p?.wants ?? 0,
            attended: mine.filter((s) => presentAt(s.id, acc)).length,
            sessions: mine.length,
            questions: questions.filter((q) => q.account_id === acc).length,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "id")),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/report] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
