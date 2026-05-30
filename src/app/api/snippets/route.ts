import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  requireScope,
  scopeEq,
  scopeColumns,
  ScopeError,
} from "@/lib/auth/scope-check";
import { resolveSessionTier } from "@/lib/auth/session-tier";
import { canUseVip } from "@/lib/tier";
import type { HighlightColor, SnippetLibraryItem } from "@/types";

type SnippetRow = {
  id: string;
  snippet_text: string;
  subject_id: string | null;
  source_module: string | null;
  color: string | null;
  created_at: string;
};

const COLORS: HighlightColor[] = ["yellow", "blue", "green", "pink", "red"];

function mapRow(r: SnippetRow): SnippetLibraryItem {
  return {
    id: r.id,
    snippetText: r.snippet_text,
    subjectId: r.subject_id,
    sourceModule: r.source_module,
    color: (r.color as HighlightColor | null) ?? null,
    createdAt: r.created_at,
  };
}

// ─── GET /api/snippets ─── list the caller's saved snippets in scope.
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();
    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }
    if (!licenseKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ snippets: [] });
    }

    const supabase = createServerClient()!;
    const { data, error } = await scopeEq(scope)(
      supabase
        .from("snippet_library")
        .select("id, snippet_text, subject_id, source_module, color, created_at")
        .eq("license_key", licenseKey)
        .order("created_at", { ascending: false })
        .limit(500)
    );
    if (error) throw error;

    const snippets = ((data as SnippetRow[]) ?? []).map(mapRow);
    return NextResponse.json({ snippets });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Snippets GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/snippets ─── save a snippet to the library.
// Body: { snippetText, subjectId?, sourceModule?, color? }
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();
    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }
    if (!licenseKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const snippetText = String(body?.snippetText ?? "").trim();
    if (!snippetText || snippetText.length > 4000) {
      return NextResponse.json({ error: "Invalid snippet" }, { status: 400 });
    }
    const subjectId = body?.subjectId ? String(body.subjectId) : null;
    const sourceModule = body?.sourceModule ? String(body.sourceModule) : null;
    const rawColor = body?.color ? String(body.color) : null;
    const color = rawColor && COLORS.includes(rawColor as HighlightColor)
      ? (rawColor as HighlightColor)
      : null;

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({
        snippet: {
          id: `mock-${Date.now()}`,
          snippetText,
          subjectId,
          sourceModule,
          color,
          createdAt: new Date().toISOString(),
        } satisfies SnippetLibraryItem,
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("snippet_library")
      .insert({
        license_key: licenseKey,
        snippet_text: snippetText,
        subject_id: subjectId,
        source_module: sourceModule,
        color,
        ...scopeColumns(scope),
      })
      .select("id, snippet_text, subject_id, source_module, color, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ snippet: mapRow(data as SnippetRow) });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Snippets POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
