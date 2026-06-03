// Generates the haistudy logo PNGs into /assets for external use (e.g. QR
// center logo). Brand colors match the in-app favicon (src/app/icon.tsx):
// green #22c55e + white #ffffff on the dark app surface.
//
//   node scripts/gen-logo.mjs
//
// Two outputs:
//   assets/haistudy-mark.png      512x512  — compact "hs" mark (favicon style)
//   assets/haistudy-wordmark.png  1280x448 — full "haistudy" wordmark
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("assets");
await mkdir(OUT, { recursive: true });

const BG = "#121317"; // app dark surface (matches the header in the screenshot)
const GREEN = "#22c55e";
const WHITE = "#ffffff";
// Plus Jakarta Sans is the app's heading font but isn't installed system-wide,
// so libvips falls back to the bold system sans below — close visual match.
const FONT = "Plus Jakarta Sans, Helvetica Neue, Helvetica, Arial, sans-serif";

const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="116" fill="${BG}"/>
  <text x="256" y="262" text-anchor="middle" dominant-baseline="central"
    font-family="${FONT}" font-weight="800" font-size="250" letter-spacing="-14">
    <tspan fill="${GREEN}">h</tspan><tspan fill="${WHITE}">s</tspan></text>
</svg>`;

const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="448" viewBox="0 0 1280 448">
  <rect width="1280" height="448" rx="72" fill="${BG}"/>
  <text x="640" y="232" text-anchor="middle" dominant-baseline="central"
    font-family="${FONT}" font-weight="800" font-size="208" letter-spacing="-6">
    <tspan fill="${GREEN}">hai</tspan><tspan fill="${WHITE}">study</tspan></text>
</svg>`;

await sharp(Buffer.from(mark)).png().toFile(path.join(OUT, "haistudy-mark.png"));
await sharp(Buffer.from(wordmark)).png().toFile(path.join(OUT, "haistudy-wordmark.png"));
console.log("wrote assets/haistudy-mark.png + assets/haistudy-wordmark.png");
