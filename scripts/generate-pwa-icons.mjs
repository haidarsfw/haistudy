// One-shot script: render PWA icons (192/512/maskable-512/badge-72) to public/icons/
// Run: node scripts/generate-pwa-icons.mjs
// Re-run any time the brand mark or theme color changes.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
await mkdir(outDir, { recursive: true });

const BG = "#0f172a";          // slate-950
const FG_GREEN = "#22c55e";    // h
const FG_WHITE = "#ffffff";    // s

function svg({ size, padding = 0, transparent = false }) {
  const inner = size - padding * 2;
  // Match the existing /icon.tsx: "h" green + "s" white, weight 800, tight letter-spacing.
  // System UI font isn't available in headless rasterisation — embed a generic sans
  // and tune the size visually.
  const fontSize = Math.round(inner * 0.68);
  const offsetY = Math.round(size / 2 + fontSize * 0.32);
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${transparent ? "" : `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${BG}"/>`}
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="${fontSize}" letter-spacing="-${Math.round(fontSize * 0.04)}" text-anchor="middle">
    <text x="${size / 2 - fontSize * 0.27}" y="${offsetY}" fill="${FG_GREEN}">h</text>
    <text x="${size / 2 + fontSize * 0.27}" y="${offsetY}" fill="${FG_WHITE}">s</text>
  </g>
</svg>`);
}

async function emit(name, size, opts = {}) {
  const buf = svg({ size, ...opts });
  await sharp(buf).png().toFile(join(outDir, name));
  console.log(`✓ ${name} (${size}x${size})`);
}

// Standard icons (rounded background)
await emit("icon-192.png", 192);
await emit("icon-512.png", 512);

// Maskable: safe zone is the inner 80% — pad outer 10% with solid bg
await emit("icon-maskable-512.png", 512, { padding: 0 });

// Badge: small monochrome silhouette for OS notification corner badge
// Render as solid white "h" on transparent so OS can recolor.
{
  const size = 72;
  const fontSize = Math.round(size * 0.78);
  const buf = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text x="${size / 2}" y="${Math.round(size * 0.78)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${fontSize}" text-anchor="middle" fill="#ffffff">h</text>
</svg>`);
  await sharp(buf).png().toFile(join(outDir, "badge-72.png"));
  console.log("✓ badge-72.png (72x72)");
}

// Apple touch icon (180x180)
await emit("apple-touch-icon.png", 180);

console.log("\nDone. Icons written to public/icons/.");
