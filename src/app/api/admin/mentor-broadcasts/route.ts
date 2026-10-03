import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { allMentorAccounts } from "@/lib/mentor/groups";
import { notify } from "@/lib/mentor/requests";

/**
 * The owner's messages to every mentor (B phase 3, migration 089). In-app
 * only, as the owner chose: each one is a notification on every licence of
 * every current mentor, and stays readable on /partner ("Dari haistudy").
 *
 *   GET   the last 20, newest first, with how many mentors got each
 *   POST  { body } — send one now
 *
 * scope-exempt: mentors teach every period; identity from validateAdmin.
 */
export async function GET() {
  const { authorized } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) return NextResponse.json({ broadcasts: [], mentors: 0 });
  const supabase = createServerClient()!;
  const [{ data, error }, mentors] = await Promise.all([
    supabase
      .from("mentor_broadcasts")
      .select("id, body, recipients, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    allMentorAccounts(supabase),
  ]);
  if (error) return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  return NextResponse.json({
    mentors: mentors.length,
    broadcasts: (data ?? []).map((r) => ({
      id: r.id as string,
      body: r.body as string,
      recipients: r.recipients as number,
      createdAt: r.created_at as string,
    })),
  });
}

export async function POST(req: Request) {
  const { authorized, licenseKey } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  const body = String(((await req.json().catch(() => ({}))) as { body?: string }).body ?? "").trim();
  if (body.length < 1 || body.length > 2000) {
    return NextResponse.json({ error: "Pesan 1 sampai 2000 karakter" }, { status: 400 });
  }

  const supabase = createServerClient()!;
  const mentors = await allMentorAccounts(supabase);
  if (!mentors.length) return NextResponse.json({ error: "Belum ada mentor aktif" }, { status: 409 });

  const { data: row, error } = await supabase
    .from("mentor_broadcasts")
    .insert({ body, sent_by: licenseKey, recipients: mentors.length })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ error: "Pesan belum tersimpan" }, { status: 500 });

  // One by one: a handful of mentors, and a failed notification for one must
  // not stop the rest (notify logs its own errors).
  for (const acc of mentors) {
    await notify(
      supabase,
      acc,
      { id: row.id as string, name: "Pesan dari haistudy" },
      "mentor_broadcast",
      "haistudy",
      body.slice(0, 200),
      "/partner"
    ).catch(() => {});
  }
  console.log(`Siaran mentor ${row.id} dikirim oleh ${licenseKey} ke ${mentors.length} mentor`);
  return NextResponse.json({ ok: true, recipients: mentors.length });
}
