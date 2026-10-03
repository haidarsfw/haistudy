import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireScope, scopeColumns, ScopeError } from "@/lib/auth/scope-check";
import { loadGroupsForAccount } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import { checkCooldown } from "@/lib/auth/cooldown";
import {
  COMMENT_ANCHOR_MAX,
  COMMENT_BODY_MAX,
  COMMENT_COLUMNS,
  commentPath,
  mentionsIn,
  type CommentVisibility,
  type MaterialComment,
} from "@/lib/comments";
import type { ScopeTuple } from "@/types/scope";

const ID_RE = /^[a-z0-9-]{1,80}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

/**
 * The viewer's groups in this period: what "grup" visibility can mean for
 * them. Reading includes archived groups (their threads stay readable);
 * writing does not (nothing new goes into an archived group).
 */
async function groupsHere(
  supabase: SupabaseClient,
  accountId: string | null,
  scope: ScopeTuple,
  { includeArchived = false }: { includeArchived?: boolean } = {}
) {
  if (!accountId) return [];
  const { mentoring, joined } = await loadGroupsForAccount(supabase, accountId, { includeArchived });
  const here = (g: { scope: ScopeTuple }) =>
    g.scope.semester === scope.semester &&
    g.scope.examPeriod === scope.examPeriod &&
    g.scope.jurusan === scope.jurusan;
  return [
    ...mentoring.filter(here).map((g) => ({ ...g, mentor: true })),
    ...joined.filter(here).map((g) => ({ ...g, mentor: false })),
  ];
}

/** The filter that keeps a viewer to the comments they may read. */
function visibleTo(accountId: string | null, groupIds: string[]): string {
  const parts = ["visibility.eq.period"];
  if (accountId) parts.push(`and(visibility.eq.private,account_id.eq.${accountId})`);
  if (groupIds.length) parts.push(`and(visibility.eq.group,group_id.in.(${groupIds.join(",")}))`);
  return parts.join(",");
}

/**
 * Comments on one module of the period the app has open.
 *   GET  ?subjectId=&moduleId=   threads the viewer may read, with reactions
 *   POST { subjectId, moduleId, body, visibility, groupId?, anchor?, parentId? }
 *
 * Scoped (requireScope): comments belong to a period. Visibility is enforced
 * here on every read; the tables are locked to the API (migration 088).
 */
export async function GET(req: Request) {
  try {
    const scope = await requireScope(req);
    const url = new URL(req.url);
    const subjectId = url.searchParams.get("subjectId") ?? "";
    const moduleId = url.searchParams.get("moduleId") ?? "";
    if (!isSupabaseServerConfigured || !ID_RE.test(subjectId) || !ID_RE.test(moduleId)) {
      return NextResponse.json({ comments: [], groups: [], canComment: false });
    }
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const groups = await groupsHere(supabase, accountId, scope, { includeArchived: true });

    const { data, error } = await supabase
      .from("material_comments")
      .select(COMMENT_COLUMNS)
      .eq("semester", scope.semester)
      .eq("exam_period", scope.examPeriod)
      .eq("jurusan", scope.jurusan)
      .eq("subject_id", subjectId)
      .eq("module_id", moduleId)
      .or(visibleTo(accountId, groups.map((g) => g.id)))
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []) as Row[];

    const ids = rows.map((r) => r.id as string);
    const { data: rx } = ids.length
      ? await supabase.from("material_comment_reactions").select("comment_id, account_id, emoji").in("comment_id", ids)
      : { data: [] };

    const comments: MaterialComment[] = rows.map((r) => {
      const deleted = Boolean(r.deleted);
      const mine = (rx ?? []).filter((x) => x.comment_id === r.id);
      const byEmoji = new Map<string, { count: number; mine: boolean }>();
      for (const x of mine) {
        const e = byEmoji.get(x.emoji as string) ?? { count: 0, mine: false };
        e.count += 1;
        if (accountId && x.account_id === accountId) e.mine = true;
        byEmoji.set(x.emoji as string, e);
      }
      return {
        id: r.id as string,
        parentId: (r.parent_id as string | null) ?? null,
        authorName: r.author_name as string,
        isMine: Boolean(accountId && r.account_id === accountId),
        body: deleted ? null : (r.body as string),
        anchor:
          r.anchor_text != null
            ? {
                text: r.anchor_text as string,
                line: (r.anchor_line as number) ?? 0,
                start: (r.anchor_start as number) ?? 0,
                end: (r.anchor_end as number) ?? 0,
              }
            : null,
        visibility: r.visibility as CommentVisibility,
        groupId: (r.group_id as string | null) ?? null,
        resolvedAt: (r.resolved_at as string | null) ?? null,
        editedAt: (r.edited_at as string | null) ?? null,
        deleted,
        createdAt: r.created_at as string,
        reactions: [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v })),
        canResolve:
          !r.parent_id &&
          (Boolean(accountId && r.account_id === accountId) ||
            (r.visibility === "group" &&
              groups.some((g) => g.mentor && g.status === "active" && g.id === r.group_id))),
      };
    });

    return NextResponse.json({
      comments,
      // Where a new comment can go: running groups only.
      groups: groups.filter((g) => g.status === "active").map((g) => ({ id: g.id, name: g.name })),
      canComment: Boolean(accountId),
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[comments] GET gagal:", error);
    return NextResponse.json({ comments: [], groups: [], canComment: false });
  }
}

/** Mentions and replies, delivered on the author's licences in THIS period only:
 *  the link inside opens a module of this period. */
async function notifyAbout(
  supabase: SupabaseClient,
  scope: ScopeTuple,
  accountIds: string[],
  root: { id: string; subjectId: string; moduleId: string },
  authorName: string,
  body: string
) {
  if (!accountIds.length) return;
  const { data: lics } = await supabase
    .from("license_keys")
    .select("key")
    .in("account_id", accountIds)
    .eq("semester", scope.semester)
    .eq("exam_period", scope.examPeriod)
    .eq("jurusan", scope.jurusan);
  if (!lics?.length) return;
  const { error } = await supabase.from("notifications").insert(
    lics.map((l) => ({
      license_key: l.key as string,
      type: "material_comment",
      sender_name: authorName,
      preview: body.slice(0, 200),
      context: "system",
      thread_id: root.id,
      subject_id: root.subjectId,
      message_id: commentPath(root.subjectId, root.moduleId, root.id),
      thread_title: "Komentar materi",
      ...scopeColumns(scope),
    }))
  );
  if (error) console.error("[comments] notifikasi gagal:", error.message);
}

export async function POST(req: Request) {
  try {
    const scope = await requireScope(req);
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId) return NextResponse.json({ error: "Masuk dengan akunmu dulu." }, { status: 401 });

    const cd = checkCooldown(`comment:${accountId}`, 1500);
    if (!cd.allowed) {
      return NextResponse.json(
        { error: "Tunggu sebentar sebelum berkomentar lagi." },
        { status: 429, headers: { "Retry-After": String(cd.retryAfter) } }
      );
    }

    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const body = String(b.body ?? "").trim();
    if (!body) return NextResponse.json({ error: "Komentarnya kosong." }, { status: 400 });
    if (body.length > COMMENT_BODY_MAX) {
      return NextResponse.json({ error: `Maksimal ${COMMENT_BODY_MAX} karakter.` }, { status: 400 });
    }
    const groups = await groupsHere(supabase, accountId, scope);
    const name = (await displayNamesForAccounts(supabase, [accountId])).get(accountId) ?? "Pengguna";

    let insert: Row;
    let root: { id: string | null; subjectId: string; moduleId: string; visibility: CommentVisibility; groupId: string | null; authorId: string | null };

    if (b.parentId) {
      // A reply: it lives in its root's thread and inherits who can read it.
      const parentId = String(b.parentId);
      if (!UUID_RE.test(parentId)) return NextResponse.json({ error: "Utas tidak ditemukan" }, { status: 404 });
      const { data: p } = await supabase
        .from("material_comments")
        .select(COMMENT_COLUMNS)
        .eq("id", parentId)
        .eq("semester", scope.semester)
        .eq("exam_period", scope.examPeriod)
        .eq("jurusan", scope.jurusan)
        .or(visibleTo(accountId, groups.map((g) => g.id)))
        .maybeSingle();
      const parent = p as Row | null;
      if (!parent || parent.parent_id) {
        return NextResponse.json({ error: "Utas tidak ditemukan" }, { status: 404 });
      }
      root = {
        id: parent.id as string,
        subjectId: parent.subject_id as string,
        moduleId: parent.module_id as string,
        visibility: parent.visibility as CommentVisibility,
        groupId: (parent.group_id as string | null) ?? null,
        authorId: (parent.account_id as string | null) ?? null,
      };
      insert = {
        parent_id: root.id,
        subject_id: root.subjectId,
        module_id: root.moduleId,
        visibility: root.visibility,
        group_id: root.groupId,
      };
    } else {
      const subjectId = String(b.subjectId ?? "");
      const moduleId = String(b.moduleId ?? "");
      if (!ID_RE.test(subjectId) || !ID_RE.test(moduleId)) {
        return NextResponse.json({ error: "Modul tidak dikenal." }, { status: 400 });
      }
      const visibility = String(b.visibility ?? "private") as CommentVisibility;
      if (visibility !== "private" && visibility !== "group" && visibility !== "period") {
        return NextResponse.json({ error: "Pilih siapa yang bisa melihat." }, { status: 400 });
      }
      let groupId: string | null = null;
      if (visibility === "group") {
        groupId = String(b.groupId ?? "");
        if (!groups.some((g) => g.id === groupId)) {
          return NextResponse.json({ error: "Kamu tidak ada di grup itu." }, { status: 400 });
        }
      }
      const a = (b.anchor ?? null) as { text?: unknown; line?: unknown; start?: unknown; end?: unknown } | null;
      const anchorText = a ? String(a.text ?? "").trim().slice(0, COMMENT_ANCHOR_MAX) : "";
      if (!anchorText) return NextResponse.json({ error: "Pilih teks yang mau dikomentari." }, { status: 400 });
      root = { id: null, subjectId, moduleId, visibility, groupId, authorId: accountId };
      insert = {
        subject_id: subjectId,
        module_id: moduleId,
        visibility,
        group_id: groupId,
        anchor_text: anchorText,
        anchor_line: Number.isFinite(Number(a?.line)) ? Math.round(Number(a?.line)) : null,
        anchor_start: Number.isFinite(Number(a?.start)) ? Math.round(Number(a?.start)) : null,
        anchor_end: Number.isFinite(Number(a?.end)) ? Math.round(Number(a?.end)) : null,
      };
    }

    const { data: row, error } = await supabase
      .from("material_comments")
      .insert({ ...insert, ...scopeColumns(scope), account_id: accountId, author_name: name.slice(0, 60), body })
      .select("id")
      .single();
    if (error) throw error;
    const rootId = root.id ?? (row.id as string);

    // Who hears about it: whoever is @mentioned among the people who can read
    // it, and the thread's author when someone replies. Never the writer.
    waitUntil(
      (async () => {
        const wanted = mentionsIn(body);
        const audience = new Set<string>();
        if (root.visibility === "group" && root.groupId) {
          const [{ data: mem }, { data: g }] = await Promise.all([
            supabase.from("group_members").select("account_id").eq("group_id", root.groupId).eq("status", "active"),
            supabase.from("mentor_groups").select("owner_account_id").eq("id", root.groupId).maybeSingle(),
          ]);
          for (const m of mem ?? []) audience.add(m.account_id as string);
          if (g?.owner_account_id) audience.add(g.owner_account_id as string);
        } else if (root.visibility === "period") {
          const { data: thread } = await supabase
            .from("material_comments")
            .select("account_id")
            .or(`id.eq.${rootId},parent_id.eq.${rootId}`);
          for (const t of thread ?? []) if (t.account_id) audience.add(t.account_id as string);
          for (const g of groups) {
            const { data: mem } = await supabase.from("group_members").select("account_id").eq("group_id", g.id).eq("status", "active");
            for (const m of mem ?? []) audience.add(m.account_id as string);
          }
        }
        audience.delete(accountId);
        const names = await displayNamesForAccounts(supabase, [...audience]);
        const targets = new Set<string>();
        for (const [acc, n] of names) {
          const first = n.toLowerCase().split(/\s+/)[0];
          if (wanted.includes(first) || wanted.includes(n.toLowerCase().replace(/\s+/g, ""))) targets.add(acc);
        }
        if (root.id && root.authorId && root.authorId !== accountId && root.visibility !== "private") {
          targets.add(root.authorId);
        }
        await notifyAbout(supabase, scope, [...targets], { id: rootId, subjectId: root.subjectId, moduleId: root.moduleId }, name, body);
      })().catch((e) => console.error("[comments] notifikasi gagal:", e))
    );

    return NextResponse.json({ ok: true, id: row.id, rootId });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[comments] POST gagal:", error);
    return NextResponse.json({ error: "Komentar belum tersimpan" }, { status: 500 });
  }
}
