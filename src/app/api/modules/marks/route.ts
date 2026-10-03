import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireScope, scopeColumns, ScopeError } from "@/lib/auth/scope-check";
import { loadGroupsForAccount } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import type { GroupModuleState } from "@/lib/mentor/modules";
import type { AgendaItem } from "@/lib/mentor/sessions";

const ID_RE = /^[a-z0-9-]{1,80}$/;

/**
 * Module markers for one subject in the period the app has open.
 *   GET ?subjectId=  → your own marks, and for each module the group's state
 *                      (scheduled / done) from the sessions of your groups in
 *                      this period
 *   PUT { subjectId, moduleId, moduleTitle, status: "want" | "done" | null }
 *                    → set or clear your own mark
 *
 * Scoped: marks belong to a period (requireScope); identity is the account.
 */
export async function GET(req: Request) {
  try {
    const scope = await requireScope(req);
    const subjectId = new URL(req.url).searchParams.get("subjectId") ?? "";
    if (!isSupabaseServerConfigured || !ID_RE.test(subjectId)) {
      return NextResponse.json({ marks: [], group: [] });
    }
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId) return NextResponse.json({ marks: [], group: [] });

    const [{ data: marks }, groups] = await Promise.all([
      supabase
        .from("module_marks")
        .select("module_id, status")
        .eq("account_id", accountId)
        .eq("semester", scope.semester)
        .eq("exam_period", scope.examPeriod)
        .eq("jurusan", scope.jurusan)
        .eq("subject_id", subjectId),
      loadGroupsForAccount(supabase, accountId),
    ]);

    // Groups that teach THIS period: their agendas say what is scheduled/done.
    const here = [...groups.mentoring, ...groups.joined].filter(
      (g) =>
        g.scope.semester === scope.semester &&
        g.scope.examPeriod === scope.examPeriod &&
        g.scope.jurusan === scope.jurusan
    );
    const group: GroupModuleState[] = [];
    if (here.length) {
      const { data: sessions } = await supabase
        .from("group_sessions")
        .select("title, starts_at, status, agenda")
        .in("group_id", here.map((g) => g.id))
        .in("status", ["scheduled", "done"])
        .order("starts_at", { ascending: true });
      const now = Date.now();
      const best = new Map<string, GroupModuleState>();
      for (const s of sessions ?? []) {
        for (const a of (s.agenda ?? []) as AgendaItem[]) {
          if (a.subjectId !== subjectId || !a.module) continue;
          const upcoming = s.status === "scheduled" && Date.parse(s.starts_at as string) > now - 3 * 3600_000;
          const cand: GroupModuleState = {
            moduleId: a.module,
            state: s.status === "done" ? "done" : upcoming ? "scheduled" : "done",
            sessionTitle: s.title as string,
            startsAt: s.starts_at as string,
          };
          const prev = best.get(a.module);
          // The soonest upcoming session wins; otherwise the latest finished one.
          if (
            !prev ||
            (cand.state === "scheduled" && (prev.state !== "scheduled" || cand.startsAt < prev.startsAt)) ||
            (cand.state === "done" && prev.state === "done" && cand.startsAt > prev.startsAt)
          ) {
            best.set(a.module, cand);
          }
        }
      }
      group.push(...best.values());
    }

    return NextResponse.json({
      marks: (marks ?? []).map((m) => ({ moduleId: m.module_id as string, status: m.status as string })),
      group,
      inGroup: here.length > 0,
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[modules/marks] GET gagal:", error);
    return NextResponse.json({ marks: [], group: [] });
  }
}

export async function PUT(req: Request) {
  try {
    const scope = await requireScope(req);
    if (!isSupabaseServerConfigured) return NextResponse.json({ ok: true });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId) return NextResponse.json({ error: "Masuk dulu, ya." }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      subjectId?: string;
      moduleId?: string;
      moduleTitle?: string;
      status?: string | null;
    };
    const subjectId = String(body.subjectId ?? "");
    const moduleId = String(body.moduleId ?? "");
    if (!ID_RE.test(subjectId) || !ID_RE.test(moduleId)) {
      return NextResponse.json({ error: "Modul tidak dikenal." }, { status: 400 });
    }
    const where = {
      account_id: accountId,
      semester: scope.semester,
      exam_period: scope.examPeriod,
      jurusan: scope.jurusan,
      subject_id: subjectId,
      module_id: moduleId,
    };

    if (body.status === null || body.status === undefined || body.status === "") {
      const { error } = await supabase.from("module_marks").delete().match(where);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: null });
    }
    if (body.status !== "want" && body.status !== "done") {
      return NextResponse.json({ error: "Status penanda tidak dikenal." }, { status: 400 });
    }
    const { error } = await supabase.from("module_marks").upsert(
      {
        ...where,
        ...scopeColumns(scope),
        module_title: String(body.moduleTitle ?? "").slice(0, 200) || null,
        status: body.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,semester,exam_period,jurusan,subject_id,module_id" }
    );
    if (error) throw error;
    return NextResponse.json({ ok: true, status: body.status });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[modules/marks] PUT gagal:", error);
    return NextResponse.json({ error: "Penanda belum tersimpan" }, { status: 500 });
  }
}
