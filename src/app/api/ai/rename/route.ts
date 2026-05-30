import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";

// ─── Config ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const isGeminiConfigured = GEMINI_API_KEY.length > 0;
// Lightest Gemini model - titling is cheap, never burn Flash quota on it.
const TITLE_MODEL = "gemini-2.5-flash-lite";
const TITLE_MAX = 48;

function sanitizeTitle(raw: string): string {
  // Strip quotes/markdown/newlines the model sometimes wraps around titles.
  let t = raw.trim().replace(/^["'`*#\s]+|["'`*#\s]+$/g, "").replace(/\s+/g, " ");
  if (t.length > TITLE_MAX) t = t.slice(0, TITLE_MAX).trim();
  return t;
}

// Local heuristic fallback: first user line, trimmed. Used when no API key
// or the model call fails - we still return a usable title, never blank.
function fallbackTitle(firstUser: string): string {
  return sanitizeTitle(firstUser.split("\n")[0] || "") || "Percakapan";
}

// ─── POST /api/ai/rename - auto-title a conversation from its 1st exchange ───
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    const body = await request.json();
    const { id, licenseKey, firstUser = "", firstAssistant = "" } = body as {
      id?: string;
      licenseKey?: string;
      firstUser?: string;
      firstAssistant?: string;
    };

    if (!id || !licenseKey) {
      return NextResponse.json(
        { error: "id and licenseKey required" },
        { status: 400 }
      );
    }

    const userText = String(firstUser).slice(0, 1000);
    const assistantText = String(firstAssistant).slice(0, 1000);

    if (!userText.trim()) {
      return NextResponse.json({ error: "firstUser required" }, { status: 400 });
    }

    // Generate a short title. Fall back to heuristic on any failure so the
    // caller always gets something to persist.
    let title = fallbackTitle(userText);
    if (isGeminiConfigured) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: TITLE_MODEL,
          generationConfig: { temperature: 0.3, maxOutputTokens: 24 },
        });
        const prompt =
          "Buat judul singkat (maks 6 kata, tanpa tanda kutip, bahasa Indonesia) " +
          "untuk percakapan ini.\n\n" +
          `User: ${userText}\n` +
          (assistantText ? `AI: ${assistantText}\n` : "") +
          "\nJudul:";
        const result = await model.generateContent(prompt);
        const generated = sanitizeTitle(result.response.text());
        if (generated) title = generated;
      } catch (err) {
        console.error("AI rename generation error:", err);
        // keep fallback title
      }
    }

    // Persist the title (scoped). Mock mode just echoes it back.
    if (isSupabaseServerConfigured) {
      const supabase = createServerClient()!;
      const { error } = await scopeEq(scope)(
        supabase
          .from("ai_conversations")
          .update({ title })
          .eq("id", id)
          .eq("license_key", licenseKey)
      );
      if (error) {
        console.error("AI rename persist error:", error);
      }
    }

    return NextResponse.json({ title });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("AI rename error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
