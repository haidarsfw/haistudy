import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { UserSettings, SubjectProgress, ThemeId, FontId } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";

function mapRowToSettings(data: Record<string, unknown>): UserSettings {
  return {
    darkMode: (data.dark_mode as boolean) ?? DEFAULT_SETTINGS.darkMode,
    theme: (data.theme as ThemeId) ?? DEFAULT_SETTINGS.theme,
    font: (data.font as FontId) ?? DEFAULT_SETTINGS.font,
    language: (data.language as "id" | "en") ?? DEFAULT_SETTINGS.language,
    selectedClass: (data.selected_class as string) ?? "",
    reminder: (data.reminder as UserSettings["reminder"]) ?? null,
    hideStatus: (data.hide_status as boolean) ?? false,
    hideStatusChangedAt: (data.hide_status_changed_at as string) ?? null,
    darkModeSchedule: (data.dark_mode_schedule as UserSettings["darkModeSchedule"]) ?? DEFAULT_SETTINGS.darkModeSchedule,
    progress: (data.progress as Record<string, SubjectProgress>) ?? {},
    notes: (data.notes as Record<string, string>) ?? {},
    recentSubjects: (data.recent_subjects as string[]) ?? [],
    countdownDetailed: (data.countdown_detailed as boolean) ?? true,
    streak: (data.streak as UserSettings["streak"]) ?? null,
  };
}

// ─── Mock store ───
const mockSettings = new Map<string, UserSettings & { updatedAt: string }>();

// ─── GET /api/settings?licenseKey=xxx ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const stored = mockSettings.get(licenseKey);
      return NextResponse.json({
        settings: stored || { ...DEFAULT_SETTINGS, selectedClass: "" },
        updatedAt: stored?.updatedAt || null,
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("license_key", licenseKey)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows

    if (!data) {
      return NextResponse.json({
        settings: { ...DEFAULT_SETTINGS, selectedClass: "" },
        updatedAt: null,
      });
    }

    return NextResponse.json({
      settings: mapRowToSettings(data),
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/settings - Save settings ───
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey, settings, updatedAt } = body as {
      licenseKey: string;
      settings: UserSettings;
      updatedAt?: string;
    };

    if (!licenseKey || !settings) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Guard against unbounded JSON payloads
    const progressStr = JSON.stringify(settings.progress || {});
    const notesStr = JSON.stringify(settings.notes || {});
    if (progressStr.length > 100_000 || notesStr.length > 100_000) {
      return NextResponse.json({ error: "Data too large" }, { status: 413 });
    }

    const now = new Date().toISOString();

    if (!isSupabaseServerConfigured) {
      mockSettings.set(licenseKey, { ...settings, updatedAt: now });
      return NextResponse.json({ success: true, updatedAt: now });
    }

    const supabase = createServerClient()!;

    // Conflict resolution: only save if our updatedAt >= server's
    if (updatedAt) {
      const { data: existing } = await supabase
        .from("user_settings")
        .select("updated_at")
        .eq("license_key", licenseKey)
        .single();

      if (
        existing?.updated_at &&
        new Date(existing.updated_at) > new Date(updatedAt)
      ) {
        // Server is newer - skip save, return server settings for client reconciliation
        const { data: fullRow } = await supabase
          .from("user_settings")
          .select("*")
          .eq("license_key", licenseKey)
          .single();

        return NextResponse.json({
          success: false,
          conflict: true,
          serverUpdatedAt: existing.updated_at,
          settings: fullRow ? mapRowToSettings(fullRow) : null,
        });
      }
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        license_key: licenseKey,
        dark_mode: settings.darkMode,
        theme: settings.theme,
        font: settings.font,
        language: settings.language || "id",
        selected_class: settings.selectedClass,
        reminder: settings.reminder,
        hide_status: settings.hideStatus,
        hide_status_changed_at: settings.hideStatusChangedAt,
        dark_mode_schedule: settings.darkModeSchedule,
        progress: settings.progress,
        notes: settings.notes ?? {},
        recent_subjects: settings.recentSubjects ?? [],
        countdown_detailed: settings.countdownDetailed ?? true,
        streak: settings.streak ?? null,
        updated_at: now,
      },
      { onConflict: "license_key" }
    );

    if (error) throw error;

    // Recalculate total_quiz_score from progress data (sum of best per subject)
    if (settings.progress && Object.keys(settings.progress).length > 0) {
      let totalScore = 0;
      for (const subjectProgress of Object.values(settings.progress)) {
        const sp = subjectProgress as SubjectProgress;
        if (sp.quizScores && Object.keys(sp.quizScores).length > 0) {
          // Find the best score for this subject
          let bestScore = 0;
          for (const entry of Object.values(sp.quizScores)) {
            if (entry.score > bestScore) bestScore = entry.score;
          }
          totalScore += Math.round(bestScore);
        }
      }
      // Update license_keys.total_quiz_score (fire-and-forget)
      supabase
        .from("license_keys")
        .update({ total_quiz_score: totalScore })
        .eq("key", licenseKey)
        .then(() => {});
    }

    return NextResponse.json({ success: true, updatedAt: now });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

