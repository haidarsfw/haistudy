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

// ─── Config ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const isGeminiConfigured = GEMINI_API_KEY.length > 0;
const isDeepSeekConfigured = DEEPSEEK_API_KEY.length > 0;
const GEMINI_MODEL = "gemini-2.5-flash";
const DEEPSEEK_FAST = "deepseek-chat";
const DEEPSEEK_REASONING = "deepseek-reasoner";
const MAX_HISTORY = 40; // max conversation turns to send

// ─── Mock response for dev without API key ───
const MOCK_RESPONSES = [
  "Halo! Ini adalah **mode demo** tanpa koneksi ke Gemini AI. Untuk mengaktifkan AI, tambahkan `GEMINI_API_KEY` di environment variables.\n\nBerikut yang bisa AI bantu:\n- Menjelaskan materi kuliah\n- Menjawab pertanyaan soal\n- Membuat ringkasan\n- Latihan soal",
  "Ini adalah respons demo. Dalam mode penuh, haistudy AI akan menjawab pertanyaan kamu berdasarkan materi kuliah yang tersedia.",
  "Mode demo aktif. AI study assistant akan tersedia setelah `GEMINI_API_KEY` dikonfigurasi.",
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
      isAdmin = false,
      image = null,
    } = body as {
      message: string;
      history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
      subjectId: string | null;
      licenseKey: string;
      packageTier?: "share" | "normal" | "vip" | "diamond";
      model?: "fast" | "reasoning";
      isAdmin?: boolean;
      image?: string | null; // base64 data URL
    };

    if (!message || !licenseKey) {
      return NextResponse.json(
        { error: "message and licenseKey are required" },
        { status: 400 }
      );
    }

    // Cohort shutdown — short-circuit before any paid-API call.
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
      if (license.suspended_until && new Date(license.suspended_until) > new Date()) {
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
      }
      validatedAdmin = await isAdminFromCookies();
    }

    // Build system prompt with subject context
    const systemPrompt = buildSystemPrompt(subjectId);

    // Route: VIP or Admin → DeepSeek, else → Gemini
    // Images always go to Gemini (DeepSeek doesn't support vision)
    const useDeepSeek = (packageTier === "vip" || packageTier === "diamond" || validatedAdmin) && isDeepSeekConfigured && !image;

    // Mock mode - return non-streaming response
    if (!useDeepSeek && !isGeminiConfigured) {
      return NextResponse.json({ text: getMockResponse(), mock: true });
    }

    if (useDeepSeek) {
      // ─── DeepSeek (VIP) via OpenAI-compatible API ───
      const deepseek = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: DEEPSEEK_API_KEY,
      });

      const deepseekModel = model === "reasoning" ? DEEPSEEK_REASONING : DEEPSEEK_FAST;

      // Convert Gemini history format → OpenAI format
      const openaiHistory = history.slice(-MAX_HISTORY).map((m) => ({
        role: (m.role === "model" ? "assistant" : "user") as "assistant" | "user",
        content: m.parts.map((p) => p.text).join(""),
      }));

      // Build user message content (text + optional image)
      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: message },
      ];
      if (image) {
        userContent.push({ type: "image_url", image_url: { url: image } });
      }

      const completion = await deepseek.chat.completions.create({
        model: deepseekModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...openaiHistory,
          { role: "user", content: image ? userContent : message },
        ] as Parameters<typeof deepseek.chat.completions.create>[0]["messages"],
        stream: true,
        max_tokens: 8192,
      });

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of completion) {
              const text = chunk.choices[0]?.delta?.content;
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
      { text: message },
    ];
    if (image) {
      // Extract base64 data and mime type from data URL — surface errors rather than silently dropping
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
    console.error("AI chat error:", error);
    const errMsg = error instanceof Error ? error.message : "";
    const isQuota = errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
    return NextResponse.json(
      { error: isQuota ? "Batas kuota AI tercapai. Coba lagi nanti." : "Gagal menghubungi AI. Silakan coba lagi." },
      { status: isQuota ? 429 : 500 }
    );
  }
}
