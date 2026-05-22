import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";
import type { Announcement } from "@/types";

// ─── GET /api/announcements - active announcements for current scope ───
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);

    if (!isSupabaseServerConfigured) {
      // Return mock active announcements
      return NextResponse.json({
        announcements: [
          {
            id: "mock-1",
            message:
              "Selamat datang di haistudy! Platform ini masih dalam tahap pengembangan.",
            type: "info",
            active: true,
            createdAt: new Date().toISOString(),
          },
        ] satisfies Announcement[],
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await scopeEq(scope)(
      supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5)
    );

    if (error) throw error;

    const announcements: Announcement[] = (data || []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        message: row.message as string,
        type: row.type as "info" | "warning" | "maintenance",
        active: row.active as boolean,
        createdAt: row.created_at as string,
      })
    );

    return NextResponse.json({ announcements });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Announcements GET error:", error);
    return NextResponse.json({ announcements: [] });
  }
}
