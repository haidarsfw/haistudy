import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { checkCooldown } from "@/lib/auth/cooldown";
import { ARCHIVED_ERROR, isGroupArchived, roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import {
  GROUP_MESSAGE_COLUMNS,
  GROUP_MESSAGE_MAX,
  GROUP_QUOTE_MAX,
  GROUP_QUOTE_SOURCE_MAX,
  toGroupMessage,
} from "@/lib/mentor/chat";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 50;

/**
 * A mentoring group's chat: GET history, POST a message, DELETE one.
 *
 * Members and mentors only, checked on every call; a stranger gets the same
 * 404 as a group that does not exist. Reading an archived group still works
 * (its history is the group's record), writing to one does not.
 *
 * scope-exempt: a group's audience is its members, not a period — a mentor on
 * semester 3 teaches semester 1. Identity from the account, or from the
 * licence's account inside the app (requestingAccountId).
 */

async function gate(id: string) {
  if (!isSupabaseServerConfigured) {
    return { error: NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 }) };
  }
  const supabase = createServerClient()!;
  const accountId = await requestingAccountId(supabase);
  if (!accountId) {
    return { error: NextResponse.json({ error: "Masuk dulu, ya." }, { status: 401 }) };
  }
  const role = UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
  if (!role) {
    return { error: NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 }) };
  }
  return { supabase, accountId, role };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const g = await gate(id);
    if ("error" in g) return g.error;

    const before = new URL(req.url).searchParams.get("before");
    let q = g.supabase
      .from("group_messages")
      .select(GROUP_MESSAGE_COLUMNS)
      .eq("group_id", id)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    if (before && !Number.isNaN(Date.parse(before))) q = q.lt("created_at", before);
    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({
      messages: (data ?? []).map((r) => toGroupMessage(r as Record<string, unknown>)).reverse(),
      hasMore: (data ?? []).length === PAGE,
      role: g.role,
      // Which messages are the caller's own (their delete button).
      me: g.accountId,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/messages] GET gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const g = await gate(id);
    if ("error" in g) return g.error;

    if (await isGroupArchived(g.supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }

    // Same gentle flood guard as the class chat.
    const cd = checkCooldown(`group-msg:${g.accountId}`, 800);
    if (!cd.allowed) {
      return NextResponse.json(
        { error: "Terlalu cepat mengirim pesan." },
        { status: 429, headers: { "Retry-After": String(cd.retryAfter) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      content?: string;
      quote?: string;
      quoteSource?: string;
      isQuestion?: boolean;
    };
    const content = String(body.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "Pesannya kosong." }, { status: 400 });
    if (content.length > GROUP_MESSAGE_MAX) {
      return NextResponse.json({ error: `Maksimal ${GROUP_MESSAGE_MAX} karakter.` }, { status: 400 });
    }
    const quote = String(body.quote ?? "").trim().slice(0, GROUP_QUOTE_MAX) || null;
    const quoteSource = quote
      ? String(body.quoteSource ?? "").trim().slice(0, GROUP_QUOTE_SOURCE_MAX) || null
      : null;

    const name = (await displayNamesForAccounts(g.supabase, [g.accountId])).get(g.accountId) ?? "Pengguna";
    const { data, error } = await g.supabase
      .from("group_messages")
      .insert({
        group_id: id,
        account_id: g.accountId,
        author_name: name.slice(0, 60),
        is_mentor: g.role === "mentor",
        content,
        quote,
        quote_source: quoteSource,
        // A question asked from the material always goes on the board.
        is_question: Boolean(body.isQuestion) || Boolean(quote),
      })
      .select(GROUP_MESSAGE_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ message: toGroupMessage(data as Record<string, unknown>) });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/messages] POST gagal:", error);
    return NextResponse.json({ error: "Pesan gagal dikirim" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const g = await gate(id);
    if ("error" in g) return g.error;
    if (await isGroupArchived(g.supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }
    const messageId = new URL(req.url).searchParams.get("messageId") ?? "";
    if (!UUID_RE.test(messageId)) {
      return NextResponse.json({ error: "Pesan tidak ditemukan" }, { status: 404 });
    }

    // Your own message, or any message if you lead the group. The text is
    // overwritten, not only hidden: "hapus" should mean the words are gone.
    let q = g.supabase
      .from("group_messages")
      .update({ deleted: true, content: "(dihapus)", quote: null, quote_source: null })
      .eq("id", messageId)
      .eq("group_id", id);
    if (g.role !== "mentor") q = q.eq("account_id", g.accountId);
    const { data, error } = await q.select("id");
    if (error) throw error;
    if (!(data ?? []).length) {
      return NextResponse.json({ error: "Pesan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/messages] DELETE gagal:", error);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}

/**
 * PATCH ?messageId= { answered: boolean } — mark a question answered (or
 * reopen it). The mentor, or whoever asked it.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const g = await gate(id);
    if ("error" in g) return g.error;
    if (await isGroupArchived(g.supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }
    const messageId = new URL(req.url).searchParams.get("messageId") ?? "";
    if (!UUID_RE.test(messageId)) {
      return NextResponse.json({ error: "Pertanyaan tidak ditemukan" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as { answered?: boolean };
    if (typeof body.answered !== "boolean") {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }
    let q = g.supabase
      .from("group_messages")
      .update({ answered_at: body.answered ? new Date().toISOString() : null })
      .eq("id", messageId)
      .eq("group_id", id)
      .eq("is_question", true)
      .eq("deleted", false);
    if (g.role !== "mentor") q = q.eq("account_id", g.accountId);
    const { data, error } = await q.select("id");
    if (error) throw error;
    if (!(data ?? []).length) {
      return NextResponse.json({ error: "Pertanyaan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/messages] PATCH gagal:", error);
    return NextResponse.json({ error: "Belum tersimpan" }, { status: 500 });
  }
}
