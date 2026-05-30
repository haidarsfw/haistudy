// ============================================
// resolveSessionTier - server-side tier from cookies
// ============================================
// hs-session holds the license key; hs-admin gates admin. We look up the
// real package_tier from license_keys (never trust a client-provided tier)
// so VIP-only routes (vip-lounge, DM) can gate with canUseVip().

import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import type { PackageTier } from "@/lib/tier";

export interface SessionTier {
  isAdmin: boolean;
  tier: PackageTier;
  licenseKey: string;
}

export async function resolveSessionTier(): Promise<SessionTier> {
  const isAdmin = await isAdminFromCookies();
  const jar = await cookies();
  const licenseKey = (jar.get("hs-session")?.value ?? "").toUpperCase();

  if (!isSupabaseServerConfigured || !licenseKey) {
    return { isAdmin, tier: "normal", licenseKey };
  }

  const supabase = createServerClient()!;
  const { data } = await supabase
    .from("license_keys")
    .select("package_tier")
    .eq("key", licenseKey)
    .single();
  const tier = ((data as { package_tier?: PackageTier } | null)?.package_tier ??
    "normal") as PackageTier;
  return { isAdmin, tier, licenseKey };
}
