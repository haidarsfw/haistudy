import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import type { ForumPoll, PollOption } from "@/types";

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
    const { data: pollsData, error } = await supabase
      .from("forum_polls")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch user's votes if voterId provided
    const userVotes = new Map<string, number>();
    if (voterId && pollsData && pollsData.length > 0) {
      const pollIds = pollsData.map((p) => p.id);
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

    const polls: ForumPoll[] = (pollsData || []).map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      question: row.question,
      options: row.options as PollOption[],
      totalVotes: row.total_votes,
      authorId: row.author_id,
      authorName: row.author_name,
      active: row.active,
      createdAt: row.created_at,
      userVote: userVotes.get(row.id) ?? null,
    }));

    return NextResponse.json({ polls });
  } catch (error) {
    console.error("Forum polls GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/forum/polls - Create poll ───
export async function POST(request: Request) {
  try {
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
      authorName: data.author_name,
      active: data.active,
      createdAt: data.created_at,
      userVote: null,
    };

    return NextResponse.json({ poll });
  } catch (error) {
    console.error("Forum polls POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/forum/polls - Delete poll ───
export async function DELETE(request: Request) {
  try {
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
      const { data: poll } = await supabase
        .from("forum_polls")
        .select("author_id")
        .eq("id", pollId)
        .single();

      if (!poll || poll.author_id !== requesterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from("forum_polls")
      .delete()
      .eq("id", pollId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forum polls DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
