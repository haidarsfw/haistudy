import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { COMMENT_BODY_MAX, COMMENT_COLUMNS } from "@/lib/comments";
import type { ScopeTuple } from "@/types/scope";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The comment, if it is in this period. Visibility is checked by the caller's rights below. */
async function load(supabase: SupabaseClient, id: string, scope: ScopeTuple) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await supabase
    .from("material_comments")
    .select(COMMENT_COLUMNS)
    .eq("id", id)
    .eq("semester", scope.semester)
    .eq("exam_period", scope.examPeriod)
    .eq("jurusan", scope.jurusan)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

/**
 * PATCH /api/comments/:id
 *   { body }            edit — the author only
 *   { resolved: bool }  mark the thread done or reopen it — on a root, by its
 *                       author or a mentor of its group
 *
 * Scoped: comments belong to a period (requireScope).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireScope(req);
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const c = accountId ? await load(supabase, id, scope) : null;
    if (!c || c.deleted) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });

    const b = (await req.json().catch(() => ({}))) as { body?: string; resolved?: boolean };
    const mine = c.account_id === accountId;

    if (typeof b.body === "string") {
      if (!mine) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
      const body = b.body.trim();
      if (!body || body.length > COMMENT_BODY_MAX) {
        return NextResponse.json({ error: `Isi komentar 1–${COMMENT_BODY_MAX} karakter.` }, { status: 400 });
      }
      const { error } = await supabase
        .from("material_comments")
        .update({ body, edited_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (typeof b.resolved === "boolean") {
      if (c.parent_id) return NextResponse.json({ error: "Tandai selesai di komentar pertamanya." }, { status: 400 });
      const mentor =
        c.visibility === "group" && c.group_id
          ? (await roleInGroup(supabase, c.group_id as string, accountId!)) === "mentor"
          : false;
      if (!mine && !mentor) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
      const { error } = await supabase
        .from("material_comments")
        .update({ resolved_at: b.resolved ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Tidak ada yang diubah." }, { status: 400 });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[comments/:id] PATCH gagal:", error);
    return NextResponse.json({ error: "Belum tersimpan" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments/:id — the author only. The text is overwritten and the
 * row kept, so the replies under a deleted comment still read as a thread.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireScope(req);
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const c = accountId ? await load(supabase, id, scope) : null;
    if (!c || c.account_id !== accountId) {
      return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });
    }
    const { error } = await supabase
      .from("material_comments")
      .update({ deleted: true, body: "(dihapus)" })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[comments/:id] DELETE gagal:", error);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
