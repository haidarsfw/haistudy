import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { loadGroupsForAccount } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { COMMENT_EMOJI } from "@/lib/comments";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/comments/:id/reactions { emoji } — toggle your reaction on a
 * comment you can see. One of six emoji, as the table's check allows.
 *
 * Scoped: comments belong to a period (requireScope).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireScope(req);
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId || !UUID_RE.test(id)) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });

    const { emoji } = (await req.json().catch(() => ({}))) as { emoji?: string };
    if (!emoji || !(COMMENT_EMOJI as readonly string[]).includes(emoji)) {
      return NextResponse.json({ error: "Reaksi tidak dikenal." }, { status: 400 });
    }

    // Visible to the caller? The same rule as reading the thread.
    const { mentoring, joined } = await loadGroupsForAccount(supabase, accountId);
    const groupIds = [...mentoring, ...joined].map((g) => g.id);
    const parts = ["visibility.eq.period", `and(visibility.eq.private,account_id.eq.${accountId})`];
    if (groupIds.length) parts.push(`and(visibility.eq.group,group_id.in.(${groupIds.join(",")}))`);
    const { data: c } = await supabase
      .from("material_comments")
      .select("id")
      .eq("id", id)
      .eq("deleted", false)
      .eq("semester", scope.semester)
      .eq("exam_period", scope.examPeriod)
      .eq("jurusan", scope.jurusan)
      .or(parts.join(","))
      .maybeSingle();
    if (!c) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });

    const { data: existing } = await supabase
      .from("material_comment_reactions")
      .select("comment_id")
      .eq("comment_id", id)
      .eq("account_id", accountId)
      .eq("emoji", emoji)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("material_comment_reactions")
        .delete()
        .eq("comment_id", id)
        .eq("account_id", accountId)
        .eq("emoji", emoji);
      if (error) throw error;
      return NextResponse.json({ ok: true, on: false });
    }
    const { error } = await supabase.from("material_comment_reactions").insert({ comment_id: id, account_id: accountId, emoji });
    if (error) throw error;
    return NextResponse.json({ ok: true, on: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[comments/reactions] gagal:", error);
    return NextResponse.json({ error: "Reaksi belum tersimpan" }, { status: 500 });
  }
}
