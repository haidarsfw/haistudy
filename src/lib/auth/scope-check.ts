// ============================================
// requireScope - server-side scope enforcement
// ============================================
// Called by every API route at the top of the handler. Reads
// hs-scope cookie (set by /api/auth/validate), optionally cross-checks
// against scope provided in body/query. Service_role bypasses RLS so
// this is the ONLY guard preventing cross-scope leak.

import { cookies } from "next/headers";
import { parseScopeKey, eqScope, validateScopeTuple } from "@/lib/scope";
import type { ScopeTuple, ExamPeriod } from "@/types/scope";

export class ScopeError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Throws ScopeError(403) if the request comes from a preview-mode session.
 * Preview sessions set hs-session to "PREVIEW" (no-login preview entry)
 * or "PREVIEW01" (test license). Call from any API route that exposes
 * cohort-shared content (forum, voice, global chat).
 */
export async function assertNotPreview(): Promise<void> {
  const jar = await cookies();
  const session = jar.get("hs-session")?.value ?? "";
  if (session === "PREVIEW" || session === "PREVIEW01") {
    throw new ScopeError(
      "Preview users cannot access this resource",
      403,
      "PREVIEW_BLOCKED"
    );
  }
}

/**
 * Reads the hs-scope cookie. Throws ScopeError if missing/invalid.
 */
export async function getCookieScope(): Promise<ScopeTuple> {
  const jar = await cookies();
  const raw = jar.get("hs-scope")?.value ?? "";
  const scope = parseScopeKey(raw);
  if (!scope) throw new ScopeError("Unauthorized: no scope cookie", 401, "NO_SCOPE");
  return scope;
}

/**
 * Best-effort extract of scope from request body or query string.
 * Returns null when neither is present (caller may decide to trust cookie).
 *
 * Accepted shapes:
 *   - JSON body { scope: { semester, examPeriod, jurusan } }
 *   - JSON body { semester, examPeriod, jurusan } (flat)
 *   - Query string ?s=2&e=uas&j=bm
 */
export async function extractScopeFromRequest(req: Request): Promise<ScopeTuple | null> {
  // Query first (cheap)
  try {
    const url = new URL(req.url);
    const s = url.searchParams.get("s");
    const e = url.searchParams.get("e");
    const j = url.searchParams.get("j");
    if (s && e && j) {
      const tuple: ScopeTuple = {
        semester: parseInt(s, 10),
        examPeriod: e as ExamPeriod,
        jurusan: j,
      };
      if (validateScopeTuple(tuple)) return tuple;
    }
  } catch {
    // ignore
  }

  // Then body for non-GET
  if (req.method && req.method !== "GET" && req.method !== "DELETE") {
    try {
      const clone = req.clone();
      const body = await clone.json().catch(() => null);
      if (body && typeof body === "object") {
        const candidate = (body as { scope?: ScopeTuple }).scope
          ?? ({
            semester: (body as { semester?: number }).semester,
            examPeriod: (body as { examPeriod?: ExamPeriod }).examPeriod,
            jurusan: (body as { jurusan?: string }).jurusan,
          } as ScopeTuple);
        if (candidate && validateScopeTuple(candidate)) return candidate;
      }
    } catch {
      // body unreadable / not JSON
    }
  }

  return null;
}

/**
 * Primary helper. Returns the cookie scope; if request body/query also
 * carry scope, they MUST match (otherwise 403 SCOPE_MISMATCH).
 */
export async function requireScope(req?: Request): Promise<ScopeTuple> {
  const cookieScope = await getCookieScope();
  if (req) {
    const bodyScope = await extractScopeFromRequest(req);
    if (bodyScope && !eqScope(bodyScope, cookieScope)) {
      throw new ScopeError("Scope mismatch", 403, "SCOPE_MISMATCH");
    }
  }
  return cookieScope;
}

/**
 * Apply scope filter to a Supabase query builder. Saves boilerplate at
 * call sites: `supabase.from("chat_messages").select("*").pipe(eqScope(scope))`
 * isn't possible (no .pipe), but this returns a closure callers chain.
 *
 * Usage:
 *   const q = scopeEq(scope)(supabase.from("chat_messages").select("*"));
 *
 * Untyped on purpose - the constraint `T extends { eq(...) }` clashes with
 * `.single()` / `.maybeSingle()` thenable shapes. Callers stay typed via
 * Supabase's inference on the chained methods after this wrapper.
 */
export function scopeEq(scope: ScopeTuple) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query: any): any => {
    return query
      .eq("semester", scope.semester)
      .eq("exam_period", scope.examPeriod)
      .eq("jurusan", scope.jurusan);
  };
}

/**
 * Serialize ScopeTuple into the columns INSERT/UPSERT writes need.
 *   insert({ ...payload, ...scopeColumns(scope) })
 */
export function scopeColumns(scope: ScopeTuple) {
  return {
    semester: scope.semester,
    exam_period: scope.examPeriod,
    jurusan: scope.jurusan,
  };
}
