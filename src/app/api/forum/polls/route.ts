import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { requireScope, scopeEq, scopeColumns, ScopeError, assertNotPreview } from "@/lib/auth/scope-check";
import { checkCooldown } from "@/lib/auth/cooldown";
import { capitalizeFirst } from "@/lib/name";
import type { ForumPoll, PollOption } from "@/types";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

// ─── Mock store ───
const mockPolls = new Map<string, ForumPoll[]>();
const mockVotes = new Map<string, Map<string, number>>(); // pollId -> voterId -> optionIndex

function getMockPolls(subjectId: string, voterId?: string): ForumPoll[] {
  const polls = mockPolls.get(subjectId) || [];
  return polls.map((p) => ({
    ...p,
    userVote: voterId ? (mockVotes.get(p.id)?.get(voterId) ?? null) : null,
  }));
}

// ─── GET /api/forum/polls?subjectId=xxx&voterId=xxx ───
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const voterId = searchParams.get("voterId");

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({
        polls: getMockPolls(subjectId, voterId || undefined),
      });
    }

    const supabase = createServerClient()!;
    const { data: pollsData, error } = await scopeEq(scope)(
      supabase
        .from("forum_polls")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("active", true)
        .order("created_at", { ascending: false })
    );

    if (error) throw error;

    // Fetch user's votes if voterId provided
    const userVotes = new Map<string, number>();
    const pollRows = (pollsData ?? []) as Record<string, unknown>[];
    if (voterId && pollRows.length > 0) {
      const pollIds = pollRows.map((p) => p.id as string);
      const { data: votes } = await supabase
        .from("poll_votes")
        .select("poll_id, option_index")
        .eq("voter_id", voterId)
        .in("poll_id", pollIds);

      if (votes) {
        for (const v of votes) {
          userVotes.set(v.poll_id, v.option_index);
        }
      }
    }

    // Batch-fetch role info for poll authors (single query)
    const roleMap = new Map<
      string,
      { isAdmin: boolean; isTester: boolean; packageTier: "share" | "normal" | "vip" | "diamond" | null }
    >();
    const authorIds = Array.from(
      new Set(pollRows.map((p) => p.author_id as string).filter(Boolean))
    );
    if (authorIds.length > 0) {
      const { data: licenses } = await supabase
        .from("license_keys")
        .select("key, is_admin, is_tester, package_tier")
        .in("key", authorIds);
      for (const l of licenses || []) {
        roleMap.set(l.key as string, {
          isAdmin: Boolean(l.is_admin),
          isTester: Boolean(l.is_tester),
          packageTier: (l.package_tier as "share" | "normal" | "vip" | "diamond" | null) ?? null,
        });
      }
    }

    const polls: ForumPoll[] = pollRows.map((row) => {
      const role = roleMap.get(row.author_id as string);
      return {
        id: row.id as string,
        subjectId: row.subject_id as string,
        question: row.question as string,
        options: row.options as PollOption[],
        totalVotes: row.total_votes as number,
        authorId: row.author_id as string,
        authorName: capitalizeFirst(row.author_name as string),
        active: row.active as boolean,
        createdAt: row.created_at as string,
        userVote: userVotes.get(row.id as string) ?? null,
        isAdmin: role?.isAdmin ?? false,
        isTester: role?.isTester ?? false,
        packageTier: role?.packageTier ?? null,
      };
    });

    return NextResponse.json({ polls });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Forum polls GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/forum/polls - Create poll ───
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const { subjectId, question, options, authorId, authorName } = body;

    if (
      !subjectId ||
      !question?.trim() ||
      !authorId ||
      !authorName ||
      !Array.isArray(options) ||
      options.length < 2
    ) {
      return NextResponse.json(
        { error: "Missing required fields (min 2 options)" },
        { status: 400 }
      );
    }

    if (question.length > 300) {
      return NextResponse.json({ error: "Question too long (max 300)" }, { status: 400 });
    }
    if (options.length > 10) {
      return NextResponse.json({ error: "Too many options (max 10)" }, { status: 400 });
    }
    for (const opt of options) {
      if (typeof opt === "string" && opt.length > 100) {
        return NextResponse.json({ error: "Option too long (max 100)" }, { status: 400 });
      }
    }

    // Flood guard: poll creation is infrequent → a longer cooldown.
    const _lk = (await cookies()).get("hs-session")?.value?.toUpperCase();
    if (_lk) {
      const cd = checkCooldown(`forum-poll:${_lk}`, 3000);
      if (!cd.allowed) {
        return NextResponse.json(
          { error: "Tunggu sebentar sebelum membuat poll lagi." },
          { status: 429, headers: { "Retry-After": String(cd.retryAfter) } }
        );
      }
    }

    const pollOptions: PollOption[] = options
      .filter((o: string) => o.trim())
      .map((text: string) => ({ text: text.trim(), votes: 0 }));

    if (pollOptions.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 non-empty options" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const poll: ForumPoll = {
        id: crypto.randomUUID(),
        subjectId,
        question: question.trim(),
        options: pollOptions,
        totalVotes: 0,
        authorId,
        authorName,
        active: true,
        createdAt: new Date().toISOString(),
        userVote: null,
      };
      const existing = mockPolls.get(subjectId) || [];
      mockPolls.set(subjectId, [poll, ...existing]);
      return NextResponse.json({ poll });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("forum_polls")
      .insert({
        subject_id: subjectId,
        question: question.trim(),
        options: pollOptions,
        author_id: authorId,
        author_name: authorName,
        ...scopeColumns(scope),
      })
      .select()
      .single();

    if (error) throw error;

    const poll: ForumPoll = {
      id: data.id,
      subjectId: data.subject_id,
      question: data.question,
      options: data.options as PollOption[],
      totalVotes: data.total_votes,
      authorId: data.author_id,
      authorName: capitalizeFirst(data.author_name),
      active: data.active,
      createdAt: data.created_at,
      userVote: null,
    };

    return NextResponse.json({ poll });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Forum polls POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/forum/polls - Delete poll ───
export async function DELETE(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const { pollId, requesterId } = body;
    const isAdmin = await isAdminFromCookies();

    if (!pollId || !requesterId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      for (const [subjectId, polls] of mockPolls.entries()) {
        const poll = polls.find((p) => p.id === pollId);
        if (poll) {
          if (poll.authorId !== requesterId && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
          }
          mockPolls.set(
            subjectId,
            polls.filter((p) => p.id !== pollId)
          );
          mockVotes.delete(pollId);
          break;
        }
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    if (!isAdmin) {
      const { data: poll } = await scopeEq(scope)(
        supabase
          .from("forum_polls")
          .select("author_id")
          .eq("id", pollId)
          .single()
      );

      if (!poll || poll.author_id !== requesterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { error } = await scopeEq(scope)(
      supabase
        .from("forum_polls")
        .delete()
        .eq("id", pollId)
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Forum polls DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
