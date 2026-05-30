// ============================================
// Admin scope resolver
// ============================================
// Every /api/admin/** route resolves scope through this helper. It maps the
// two query-string knobs the admin client uses (`?allPeriods=1` or
// `?scope=s2-uas-bm`) to a discriminated result. When neither is set, the
// admin's hs-scope cookie is the fallback - same as non-admin routes.
//
// Mutation routes should refuse `mode === "all"` (you can't write without
// picking a specific scope). Exception: bulk log delete in danger-zone may
// allow cross-scope clear; that route opts in explicitly.

import {
  requireScope,
  ScopeError,
} from "@/lib/auth/scope-check";
import { isAvailableScope, parseScopeKey } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";

export type ResolvedAdminScope =
  | { mode: "scoped"; scope: ScopeTuple }
  | { mode: "all" };

export async function resolveAdminScope(req: Request): Promise<ResolvedAdminScope> {
  const url = new URL(req.url);

  if (url.searchParams.get("allPeriods") === "1") {
    return { mode: "all" };
  }

  const override = url.searchParams.get("scope");
  if (override) {
    const s = parseScopeKey(override);
    if (!s || !isAvailableScope(s)) {
      throw new ScopeError("Invalid scope", 400, "INVALID_SCOPE");
    }
    return { mode: "scoped", scope: s };
  }

  // Fallback: admin's hs-scope cookie (their own bound scope).
  const scope = await requireScope(req);
  return { mode: "scoped", scope };
}

/**
 * Reject `mode === "all"` for mutation endpoints. Throws ScopeError(400).
 */
export function requireScopedMode(
  resolved: ResolvedAdminScope
): asserts resolved is { mode: "scoped"; scope: ScopeTuple } {
  if (resolved.mode === "all") {
    throw new ScopeError(
      "Pilih scope spesifik untuk operasi ini - 'All periods' tidak boleh untuk mutation.",
      400,
      "ALL_PERIODS_NOT_ALLOWED"
    );
  }
}
