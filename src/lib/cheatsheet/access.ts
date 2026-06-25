import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScopeTuple } from "@/types/scope";

// SERVER-ONLY: import this module only from route handlers (never a client
// component) — it holds the PDF password. Route handlers are not bundled into
// client JS, so the password stays off the wire except via the gated /access
// response. (No `server-only` package guard to avoid an extra dependency.)

/**
 * Cheat-sheet download access helpers.
 *
 * The download lock lives in the existing `scope_feature_flags` table (no new
 * schema): one boolean row per (scope, subject). Absent row = locked. Read with
 * a single tiny SELECT; flipped by an admin UPSERT — NOT realtime, so it cannot
 * trigger the subscription retry-loop that caused past outages.
 *
 * CHEATSHEET_PASSWORD is the open password baked into the encrypted PDFs, read
 * from the environment (NOT hardcoded — must stay out of the public repo). Set
 * `CHEATSHEET_PASSWORD` in Vercel env + local `.env.local`; it must match the
 * password the encrypted PDFs (under src/content/cheatsheets) were made with.
 * Shown in-app only to logged-in users via the gated /access response; this
 * module is imported solely by route handlers, so it never reaches client JS.
 */
export const CHEATSHEET_PASSWORD = process.env.CHEATSHEET_PASSWORD ?? "";

export const cheatsheetFeatureKey = (subject: string) =>
  `cheatsheet_dl_${subject}`;

export async function getDownloadUnlocked(
  supabase: SupabaseClient,
  scope: ScopeTuple,
  subject: string
): Promise<boolean> {
  const { data } = await supabase
    .from("scope_feature_flags")
    .select("enabled")
    .eq("semester", scope.semester)
    .eq("exam_period", scope.examPeriod)
    .eq("jurusan", scope.jurusan)
    .eq("feature_key", cheatsheetFeatureKey(subject))
    .maybeSingle();
  return Boolean(data?.enabled);
}

export async function setDownloadUnlocked(
  supabase: SupabaseClient,
  scope: ScopeTuple,
  subject: string,
  enabled: boolean
): Promise<void> {
  await supabase.from("scope_feature_flags").upsert(
    {
      semester: scope.semester,
      exam_period: scope.examPeriod,
      jurusan: scope.jurusan,
      feature_key: cheatsheetFeatureKey(subject),
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "semester,exam_period,jurusan,feature_key" }
  );
}
