import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

/* GET — list muted conversation_lks for current user */
export async function GET() {
  const cookieStore = await cookies();
  const recipientLk = cookieStore.get("hs-session")?.value;
  if (!recipientLk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ mutes: [] });
  }
  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("support_mutes")
    .select("conversation_lk, muted_at")
    .eq("recipient_lk", recipientLk);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    mutes: (data ?? []).map((r) => ({
      conversationLk: r.conversation_lk as string,
      mutedAt: r.muted_at as string,
    })),
  });
}

/* POST — mute conversation { conversationLk } */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const recipientLk = cookieStore.get("hs-session")?.value;
  if (!recipientLk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { conversationLk } = (await req.json()) as { conversationLk?: string };
  if (!conversationLk) {
    return NextResponse.json(
      { error: "Missing conversationLk" },
      { status: 400 }
    );
  }
  if (!isSupabaseServerConfigured) return NextResponse.json({ ok: true });
  const supabase = createServerClient()!;
  const { error } = await supabase.from("support_mutes").upsert(
    {
      recipient_lk: recipientLk,
      conversation_lk: conversationLk,
    },
    { onConflict: "recipient_lk,conversation_lk" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/* DELETE — unmute conversation ?conversationLk=KEY */
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const recipientLk = cookieStore.get("hs-session")?.value;
  if (!recipientLk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conversationLk = req.nextUrl.searchParams.get("conversationLk");
  if (!conversationLk) {
    return NextResponse.json(
      { error: "Missing conversationLk" },
      { status: 400 }
    );
  }
  if (!isSupabaseServerConfigured) return NextResponse.json({ ok: true });
  const supabase = createServerClient()!;
  const { error } = await supabase
    .from("support_mutes")
    .delete()
    .eq("recipient_lk", recipientLk)
    .eq("conversation_lk", conversationLk);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
