import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared brand Open Graph / Twitter card image. Rendered by both
// `app/opengraph-image.tsx` and `app/twitter-image.tsx` so link previews
// (WhatsApp, Telegram, iMessage, Twitter/X, etc.) get a real, full-bleed
// image instead of falling back to the rounded app icon — which scrapers
// composite onto a white background, producing white corners.
//
// The background matches the wordmark tile color (#121317) exactly, so the
// asset's rounded plate dissolves into the canvas: edge-to-edge dark, no
// visible card, no white corners. The wordmark is sized with generous
// padding so it reads as branding, not a zoomed-in crop.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT =
  "haistudy — Platform Belajar All in One untuk mahasiswa BINUS";

// Matches assets/haistudy-wordmark.png tile color so the plate is seamless.
const BG = "#121317";
// Native wordmark is 1280×448 (ratio ≈ 2.857). Render at a moderate width.
const WORDMARK_W = 648;
const WORDMARK_H = Math.round((WORDMARK_W * 448) / 1280); // 227

export async function renderBrandOg() {
  const wordmark = await readFile(
    join(process.cwd(), "assets/haistudy-wordmark.png"),
    "base64"
  );
  const wordmarkSrc = `data:image/png;base64,${wordmark}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wordmarkSrc}
          width={WORDMARK_W}
          height={WORDMARK_H}
          alt="haistudy"
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            display: "flex",
            marginTop: -6,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: "-0.5px",
            color: "#cbd5e1",
          }}
        >
          Platform Belajar All in One — BINUS
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
