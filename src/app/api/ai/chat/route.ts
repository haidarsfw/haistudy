import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/ai/context";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { AI_ENABLED, AI_DISABLED_MESSAGE } from "@/lib/feature-flags";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";

// ─── Config ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const isGeminiConfigured = GEMINI_API_KEY.length > 0;
const isDeepSeekConfigured = DEEPSEEK_API_KEY.length > 0;
const GEMINI_MODEL = "gemini-2.5-flash"; // images only - DeepSeek V4 has no vision
const DEEPSEEK_FLASH = "deepseek-v4-flash"; // FREE tier text
const DEEPSEEK_PRO = "deepseek-v4-pro"; // VIP/diamond/admin text
const MAX_HISTORY = 40; // max conversation turns to send

// ─── Mock response for dev without API key ───
const MOCK_RESPONSES = [
  "Halo! Ini adalah **mode demo** tanpa koneksi ke AI. Untuk mengaktifkan AI, tambahkan `DEEPSEEK_API_KEY` (teks) dan `GEMINI_API_KEY` (gambar) di environment variables.\n\nBerikut yang bisa AI bantu:\n- Menjelaskan materi kuliah\n- Menjawab pertanyaan soal\n- Membuat ringkasan\n- Latihan soal",
  "Ini adalah respons demo. Dalam mode penuh, haistudy AI akan menjawab pertanyaan kamu berdasarkan materi kuliah yang tersedia.",
  "Mode demo aktif. AI study assistant akan tersedia setelah API key dikonfigurasi.",
];

function getMockResponse(): string {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

// ─── POST /api/ai/chat ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message,
      history = [],
      subjectId = null,
      licenseKey,
      packageTier = "normal",
      model = "fast",
      image = null,
      referenceText = null,
    } = body as {
      message: string;
      history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
      subjectId: string | null;
      licenseKey: string;
      packageTier?: "share" | "normal" | "vip" | "diamond";
      model?: "fast" | "reasoning";
      image?: string | null; // base64 data URL
      referenceText?: string | null; // selected materi text to anchor the answer
    };

    if (!message || !licenseKey) {
      return NextResponse.json(
        { error: "message and licenseKey are required" },
        { status: 400 }
      );
    }

    // Cohort shutdown - short-circuit before any paid-API call.
    if (!AI_ENABLED) {
      return NextResponse.json({ text: AI_DISABLED_MESSAGE, mock: true });
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Pesan terlalu panjang (maks 2000 karakter)" },
        { status: 400 }
      );
    }

    if (history.length > MAX_HISTORY) {
      return NextResponse.json(
        { error: "History too long" },
        { status: 400 }
      );
    }

    // Scope context - drives knowledge-base loading + ai_conversations storage.
    // License identity is scope-agnostic (admin can switch session scope freely),
    // but the materi fed into the system prompt is locked to this scope: a UAS
    // request never sees UTS content, and vice versa.
    const scope = await requireScope(request);

    // Validate license key against DB and determine admin status server-side
    let validatedAdmin = false;
    if (isSupabaseServerConfigured) {
      const supabase = createServerClient()!;
      const { data: license } = await supabase
        .from("license_keys")
        .select("key, suspended_until")
        .eq("key", licenseKey)
        .single();

      if (!license) {
        return NextResponse.json({ error: "Invalid license key" }, { status: 401 });
      }
      if ((license as Record<string, unknown>).suspended_until && new Date((license as Record<string, unknown>).suspended_until as string) > new Date()) {
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
      }
      validatedAdmin = await isAdminFromCookies();
    }

    // Build system prompt with scope-locked subject context.
    const systemPrompt = await buildSystemPrompt(scope, subjectId);

    // Issue 10: when the user selected materi text ("Tanya AI"), anchor the
    // answer to that snippet as the primary focus while keeping full-subject
    // context available. Cap length so a huge selection can't blow the budget.
    const ref = (referenceText ?? "").trim().slice(0, 1500);
    const anchoredMessage = ref
      ? `User menyorot teks berikut dari materi (JAWAB BERDASARKAN teks ini sebagai fokus utama; gunakan materi subjek lain hanya bila perlu konteks):\n«${ref}»\n\nPertanyaan user: ${message}`
      : message;

    // Route: all TEXT → DeepSeek (tier only picks flash vs pro, see below).
    // Images always → Gemini (DeepSeek V4 has no vision).
    const useDeepSeek = isDeepSeekConfigured && !image;

    // Mock mode - return non-streaming response
    if (!useDeepSeek && !isGeminiConfigured) {
      return NextResponse.json({ text: getMockResponse(), mock: true });
    }

    if (useDeepSeek) {
      // ─── DeepSeek (all text tiers) via OpenAI-compatible API ───
      const deepseek = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: DEEPSEEK_API_KEY,
      });

      // Tier picks model: VIP/diamond/admin → pro, everyone else → flash.
      const isPro = packageTier === "vip" || packageTier === "diamond" || validatedAdmin;
      const deepseekModel = isPro ? DEEPSEEK_PRO : DEEPSEEK_FLASH;
      // Thinking toggle is available to ALL tiers via the model param.
      // Flash defaults thinking OFF, Pro defaults ON, so set it explicitly.
      const thinkingEnabled = model === "reasoning";

      // Convert Gemini history format → OpenAI format
      const openaiHistory = history.slice(-MAX_HISTORY).map((m) => ({
        role: (m.role === "model" ? "assistant" : "user") as "assistant" | "user",
        content: m.parts.map((p) => p.text).join(""),
      }));

      // Build user message content (text + optional image)
      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: anchoredMessage },
      ];
      if (image) {
        userContent.push({ type: "image_url", image_url: { url: image } });
      }

      // DeepSeek V4 thinking control. The OpenAI Node SDK serializes the body
      // as-is, so this top-level field reaches the API even though it's not in
      // the SDK's TS types (Python's extra_body equivalent). Built as a loose
      // object + cast because `thinking` isn't in any create() overload.
      const deepseekBody = {
        model: deepseekModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...openaiHistory,
          { role: "user", content: image ? userContent : anchoredMessage },
        ],
        stream: true,
        max_tokens: 8192,
        thinking: { type: thinkingEnabled ? "enabled" : "disabled" },
      } as unknown as Parameters<typeof deepseek.chat.completions.create>[0];

      // stream:true so the result is an async-iterable Stream of chunks.
      const completion = (await deepseek.chat.completions.create(
        deepseekBody
      )) as AsyncIterable<{
        choices: Array<{
          delta?: { content?: string; reasoning_content?: string };
        }>;
      }>;

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta as
                | { content?: string; reasoning_content?: string }
                | undefined;
              // Reasoning trace streams at the same delta level as content.
              const reasoning = delta?.reasoning_content;
              if (reasoning) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ reasoning })}\n\n`)
                );
              }
              const text = delta?.content;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("DeepSeek stream error:", error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ─── Gemini (Share / Normal) ───
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 8192,
      },
    });

    const trimmedHistory = history.slice(-MAX_HISTORY);
    const chat = geminiModel.startChat({ history: trimmedHistory });

    // Build message parts (text + optional image)
    const messageParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: anchoredMessage },
    ];
    if (image) {
      // Extract base64 data and mime type from data URL - surface errors rather than silently dropping
      const match = image.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: "Invalid image format (png/jpeg/webp/gif only)" },
          { status: 400 }
        );
      }
      // Base64 is ~1.37× the raw byte size; 7MB encoded ≈ 5MB raw
      if (match[3].length > 7_000_000) {
        return NextResponse.json(
          { error: "Image too large (max 5MB)" },
          { status: 413 }
        );
      }
      messageParts.push({
        inlineData: { mimeType: match[1], data: match[3] },
      });
    }

    const result = await chat.sendMessageStream(messageParts);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Gemini stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("AI chat error:", error);
    const errMsg = error instanceof Error ? error.message : "";
    const isQuota = errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
    return NextResponse.json(
      { error: isQuota ? "Batas kuota AI tercapai. Coba lagi nanti." : "Gagal menghubungi AI. Silakan coba lagi." },
      { status: isQuota ? 429 : 500 }
    );
  }
}
