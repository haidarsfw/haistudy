import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, scopeColumns, ScopeError, assertNotPreview } from "@/lib/auth/scope-check";

// Shared mock store references - import approach not possible across route files,
// so vote mock logic is self-contained here
const mockVotes = new Map<string, Map<string, number>>(); // pollId -> voterId -> optionIndex
const mockPollUpdates: Array<{
  pollId: string;
  optionIndex: number;
  voterId: string;
}> = [];

// Export for poll route to read votes (not used in practice since routes are separate modules)
export { mockVotes };

// ─── POST /api/forum/polls/vote ───
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const { pollId, voterId, optionIndex } = body;

    if (!pollId || !voterId || optionIndex === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (
      typeof optionIndex !== "number" ||
      !Number.isInteger(optionIndex) ||
      optionIndex < 0 ||
      optionIndex > 20
    ) {
      return NextResponse.json(
        { error: "Invalid optionIndex" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      // Check if already voted
      const pollVotes = mockVotes.get(pollId) || new Map<string, number>();
      if (pollVotes.has(voterId)) {
        return NextResponse.json(
          { error: "Kamu sudah memilih di poll ini" },
          { status: 409 }
        );
      }
      pollVotes.set(voterId, optionIndex);
      mockVotes.set(pollId, pollVotes);
      mockPollUpdates.push({ pollId, optionIndex, voterId });
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    // Validate the poll belongs to the caller's scope before recording vote.
    const { data: pollScope } = await scopeEq(scope)(
      supabase
        .from("forum_polls")
        .select("id")
        .eq("id", pollId)
        .single()
    );
    if (!pollScope) {
      return NextResponse.json({ error: "Poll tidak ditemukan dalam scope ini" }, { status: 404 });
    }

    // Insert vote (unique constraint handles duplicate prevention)
    const { error: voteError } = await supabase
      .from("poll_votes")
      .insert({
        poll_id: pollId,
        voter_id: voterId,
        option_index: optionIndex,
        ...scopeColumns(scope),
      });

    if (voteError) {
      if (voteError.code === "23505") {
        // Unique violation
        return NextResponse.json(
          { error: "Kamu sudah memilih di poll ini" },
          { status: 409 }
        );
      }
      throw voteError;
    }

    // Update poll options and total_votes
    const { data: poll } = await supabase
      .from("forum_polls")
      .select("options, total_votes, author_id, question, subject_id")
      .eq("id", pollId)
      .single();

    if (poll) {
      const options = [...(poll.options as Array<{ text: string; votes: number }>)];
      if (optionIndex >= options.length) {
        // Roll back the vote row we just inserted (phantom vote with no tally change)
        await supabase
          .from("poll_votes")
          .delete()
          .eq("poll_id", pollId)
          .eq("voter_id", voterId);
        return NextResponse.json({ error: "Invalid option" }, { status: 400 });
      }
      options[optionIndex].votes += 1;
      await supabase
        .from("forum_polls")
        .update({
          options,
          total_votes: poll.total_votes + 1,
        })
        .eq("id", pollId);

      // Notify poll creator about the vote (skip self-vote)
      if (poll.author_id && poll.author_id !== voterId) {
        try {
          await supabase.from("notifications").insert({
            license_key: poll.author_id,
            type: "poll_vote",
            sender_name: voterId,
            preview: (poll.question as string).slice(0, 200),
            context: "forum",
            thread_id: null,
            subject_id: poll.subject_id || null,
            thread_title: null,
            ...scopeColumns(scope),
          });
        } catch (notifError) {
          console.error("Failed to create poll_vote notification:", notifError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Poll vote POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
