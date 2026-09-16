import qrcode from "qrcode-generator";

import { normalizeReferralCode } from "@/lib/referral/codes";

/**
 * The QR for a partner link, as an SVG.
 *
 * Rendered on the server on purpose. A QR library in the client bundle would
 * cost every visitor bytes for a picture almost none of them will look at; as
 * markup it costs the browser nothing and the page can simply point an <img> at
 * it. It is also then printable and downloadable, which is the actual use — a
 * mentor sticking this on a poster or an NFC card.
 *
 * No database read: the code IS the handle, so this never needs to know whether
 * it exists. An unknown code produces a QR that leads to a page which quietly
 * attaches nothing — the same answer /undangan already gives.
 */

// Must run per request. Under force-static this is rendered at BUILD time,
// where `req.url` is a placeholder — the generated QR encoded
// http://localhost:3000, which on a printed poster is unfixable. The
// Cache-Control header below still lets the CDN hold it for a day, which is
// the caching that actually mattered.
export const dynamic = "force-dynamic";

const SIZE = 512;
const QUIET = 4; // modules of margin — below 4 some scanners give up

export async function GET(
  req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  // scope-exempt: public, stateless, derived entirely from the URL.
  const { handle } = await ctx.params;
  const code = normalizeReferralCode(decodeURIComponent(handle ?? "").replace(/^@/, ""));
  if (!code) return new Response("Not found", { status: 404 });

  const origin = new URL(req.url).origin;
  const target = `${origin}/@${code}`;

  // Type 0 = smallest version that fits; "M" survives a logo or a scuff.
  const qr = qrcode(0, "M");
  qr.addData(target);
  qr.make();

  const count = qr.getModuleCount();
  const total = count + QUIET * 2;
  const cells: string[] = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) cells.push(`M${c + QUIET},${r + QUIET}h1v1h-1z`);
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" ` +
    `aria-label="QR ke ${target}">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<path d="${cells.join("")}" fill="#000000"/>` +
    `</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // The code never changes once minted, so this is safe to cache hard.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
