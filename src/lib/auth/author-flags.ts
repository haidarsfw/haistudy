import type { SupabaseClient } from "@supabase/supabase-js";

import type { PackageTier } from "@/lib/tier";

/**
 * The tier and tester flag to stamp on a forum thread, read from the author's
 * licence. Threads used to copy both from the request body, so a browser could
 * post under any badge it liked; the badge is shown to everyone, so it has to
 * come from the licence. (Chat does the same inside its own tier lookup.)
 */
export async function authorFlags(
  supabase: SupabaseClient,
  licenseKey: string | null | undefined
): Promise<{ packageTier: PackageTier | null; isTester: boolean }> {
  if (!licenseKey) return { packageTier: null, isTester: false };
  const { data } = await supabase
    .from("license_keys")
    .select("package_tier, is_tester")
    .eq("key", licenseKey.toUpperCase())
    .maybeSingle();
  return {
    packageTier: (data?.package_tier as PackageTier | null) ?? null,
    isTester: Boolean(data?.is_tester),
  };
}
