import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";

interface ExportMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

function fmtTimestamp(ts?: number): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

// Render a conversation to portable Markdown. Mirrors the client Blob fallback
// used for local `chat-` ids so both paths produce identical files.
function toMarkdown(title: string, messages: ExportMessage[]): string {
  const lines: string[] = [];
  lines.push(`# ${title || "Percakapan haistudy AI"}`);
  lines.push("");
  for (const m of messages) {
    const who = m.role === "user" ? "Kamu" : "haistudy AI";
    const when = fmtTimestamp(m.timestamp);
    lines.push(`## ${who}${when ? ` (${when})` : ""}`);
    lines.push("");
    lines.push(m.content || "");
    lines.push("");
  }
  return lines.join("\n");
}

function safeFilename(title: string): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "percakapan";
  return `haistudy-ai-${base}.md`;
}

// ─── GET /api/ai/conversations/[id]/export?licenseKey=xxx ───
// Server-side markdown export for persisted (UUID) conversations. Local
// `chat-` ids never reach here - the client exports those from memory.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireScope(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!id || !licenseKey) {
      return NextResponse.json(
        { error: "id and licenseKey required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json(
        { error: "Export unavailable in mock mode" },
        { status: 503 }
      );
    }

    const supabase = createServerClient()!;
    const { data, error } = await scopeEq(scope)(
      supabase
        .from("ai_conversations")
        .select("title, messages")
        .eq("id", id)
        .eq("license_key", licenseKey)
        .single()
    );

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = data as { title: string; messages: ExportMessage[] };
    const markdown = toMarkdown(row.title, row.messages || []);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename(row.title)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("AI conversation export error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
