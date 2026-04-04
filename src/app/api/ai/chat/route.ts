import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/ai/context";

// ─── Config ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const isGeminiConfigured = GEMINI_API_KEY.length > 0;
const isDeepSeekConfigured = DEEPSEEK_API_KEY.length > 0;
const GEMINI_MODEL = "gemini-2.5-flash";
const DEEPSEEK_FAST = "deepseek-chat";
const DEEPSEEK_REASONING = "deepseek-reasoner";
const MAX_HISTORY = 20; // max conversation turns to send

// ─── Rate limiting (in-memory, per license key) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // requests per window
const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour

function checkRateLimit(licenseKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(licenseKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(licenseKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

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
    } = body as {
      message: string;
      history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
      subjectId: string | null;
      licenseKey: string;
      packageTier?: "share" | "normal" | "vip";
      model?: "fast" | "reasoning";
      isAdmin?: boolean;
    };

    if (!message || !licenseKey) {
      return NextResponse.json(
        { error: "message and licenseKey are required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Pesan terlalu panjang (maks 2000 karakter)" },
        { status: 400 }
      );
    }

    // Rate limit check
    if (!checkRateLimit(licenseKey)) {
      return NextResponse.json(
        { error: "Batas penggunaan AI tercapai. Coba lagi dalam 1 jam." },
        { status: 429 }
      );
    }

    // Build system prompt with subject context
    const systemPrompt = buildSystemPrompt(subjectId);

    // Route: VIP or Admin → DeepSeek, else → Gemini
    const useDeepSeek = (packageTier === "vip" || isAdmin) && isDeepSeekConfigured;

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

      const completion = await deepseek.chat.completions.create({
        model: deepseekModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...openaiHistory,
          { role: "user", content: message },
        ],
        stream: true,
        max_tokens: 4096,
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
        maxOutputTokens: 1024,
      },
    });

    const trimmedHistory = history.slice(-MAX_HISTORY);
    const chat = geminiModel.startChat({ history: trimmedHistory });
    const result = await chat.sendMessageStream(message);

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
