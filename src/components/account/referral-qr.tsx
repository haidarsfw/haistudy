"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

/**
 * The partner card: a branded, scannable QR a mentor can print, post, or send.
 *
 * Drawn on a canvas, in the browser, for three reasons that all point the same
 * way:
 *
 *   - PNG is what people can actually use. The download lands on a phone most
 *     of the time, and a phone gallery, WhatsApp and Instagram all understand
 *     PNG. An SVG arrives as a file nobody can open.
 *   - One implementation. Building the card as SVG on the server AND as PNG
 *     somewhere else would be the same drawing in two places, which is exactly
 *     the drift this codebase keeps paying for.
 *   - Nothing to deploy and nothing to pay for. No rasteriser on the server
 *     (sharp is deliberately excluded from the bundle), no invocation per view.
 *
 * `qrcode-generator` is imported only when someone opens this, so it never
 * reaches the bundle of a page that does not show a QR.
 */

// Brand tokens, copied as literals because canvas cannot read CSS variables.
// Kept beside the names they mirror in globals.css (--brand-1/--brand-2).
const BRAND_1 = "#10b981";
const BRAND_2 = "#047857";
const INK = "#0b1210";
const INK_2 = "#0e1613";
const PAPER = "#ffffff";
const MUTED = "#8aa79c";

// The logomark, identical to src/components/landing/logo.tsx. Same paths, same
// viewBox — if that file changes, this has to change with it.
const MARK_VIEWBOX = { x: 470, y: 500, w: 1095, h: 1075 };
const MARK_PATHS = [
  "M 793.441 664.771 C 809.551 673.089 837.5 697.347 850.668 710.423 C 880.774 740.564 905.584 775.566 924.052 813.957 C 936.831 840.468 935.541 844.247 935.288 873.002 C 935.12 889.354 935.097 905.708 935.219 922.06 C 973.039 887.762 1005.31 878.26 1056.91 877.288 C 1110.26 876.913 1161.6 896.051 1199.48 933.763 C 1267.53 1001.53 1255.81 1097.54 1255.8 1184.93 L 1255.87 1422.78 C 1193.45 1451.94 1158.05 1479.98 1112.95 1532.82 L 1112.92 1195.25 L 1113.47 1139.37 C 1113.97 1099.01 1115.8 1064.4 1086.17 1032.59 C 1054.16 998.241 1001.07 999.928 967.948 1032.63 C 953.029 1047.24 942.853 1066 938.745 1086.48 C 935.02 1105.62 936.103 1129.27 936.104 1149.06 L 936.147 1231.1 L 935.967 1533.09 C 908.189 1496.84 874.122 1465.34 834.127 1443.1 C 820.725 1435.65 806.568 1429.59 793.094 1422.29 L 793.079 915.351 C 793.138 832.308 792.268 747.693 793.441 664.771 z",
  "M 1532.49 578.535 L 1533.83 578.519 C 1534.25 579.007 1534.67 579.495 1535.09 579.983 C 1535.29 611.147 1535.19 694.151 1535.19 720.61 L 1535.11 1369.41 C 1448.27 1368.71 1399.88 1372.48 1316.23 1399.1 L 1316.12 1216.25 L 1316.12 1121.49 C 1316.14 1070.72 1317.24 1032.07 1300.36 982.755 C 1288.06 941.507 1266.99 906.834 1236.58 876.264 C 1204.37 843.878 1168.9 828.995 1126.1 815.661 C 1142.48 777.567 1171.05 739.351 1199.86 709.524 C 1289.57 616.627 1405.4 580.08 1532.49 578.535 z",
  "M 510.674 578.831 C 542.158 578.929 573.298 583.242 604.37 587.705 C 649.638 594.206 689.307 609.277 731.175 627.229 L 730.985 1399.09 C 652.423 1370.86 591.941 1369.69 510.721 1369.54 L 510.674 578.831 z",
  "M 1014.33 533.395 C 1055.82 528.53 1093.42 558.16 1098.39 599.637 C 1103.37 641.114 1073.83 678.792 1032.37 683.872 C 990.753 688.971 952.906 659.306 947.915 617.677 C 942.925 576.047 972.687 538.278 1014.33 533.395 z",
];

const W = 1080;
const H = 1350;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The page's resolved font stack, so the card matches the site rather than
 *  falling back to whatever the canvas default happens to be. */
function fontStack(): string {
  try {
    const f = getComputedStyle(document.body).fontFamily;
    return f || "system-ui, sans-serif";
  } catch {
    return "system-ui, sans-serif";
  }
}

async function drawCard(canvas: HTMLCanvasElement, code: string) {
  const qrcode = (await import("qrcode-generator")).default;
  const url = `${window.location.origin}/@${code}`;

  // Level M survives a fold, a scuff, and a cheap camera.
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;
  const family = fontStack();

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, INK);
  bg.addColorStop(1, INK_2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // A soft brand wash in the top-left, the same move the site's background
  // makes. Keeps the card from reading as a plain black rectangle.
  const wash = ctx.createRadialGradient(150, 120, 0, 150, 120, 900);
  wash.addColorStop(0, "rgba(16,185,129,0.20)");
  wash.addColorStop(1, "rgba(16,185,129,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(16,185,129,0.28)";
  ctx.lineWidth = 3;
  roundRect(ctx, 22, 22, W - 44, H - 44, 48);
  ctx.stroke();

  // ── Logomark ──
  const markSize = 120;
  const scale = markSize / MARK_VIEWBOX.w;
  ctx.save();
  ctx.translate(W / 2 - markSize / 2, 110);
  ctx.scale(scale, scale);
  ctx.translate(-MARK_VIEWBOX.x, -MARK_VIEWBOX.y);
  const markGrad = ctx.createLinearGradient(520, 560, 1520, 1500);
  markGrad.addColorStop(0, BRAND_1);
  markGrad.addColorStop(1, BRAND_2);
  ctx.fillStyle = markGrad;
  for (const d of MARK_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();

  // ── Wordmark: "hai" in brand, "study" in white, drawn as one centred line ──
  const wordSize = 76;
  ctx.font = `700 ${wordSize}px ${family}`;
  ctx.textBaseline = "alphabetic";
  const wHai = ctx.measureText("hai").width;
  const wStudy = ctx.measureText("study").width;
  const wordY = 110 + markSize + 96;
  let wx = W / 2 - (wHai + wStudy) / 2;
  ctx.fillStyle = BRAND_1;
  ctx.fillText("hai", wx, wordY);
  wx += wHai;
  ctx.fillStyle = "#f2f7f5";
  ctx.fillText("study", wx, wordY);

  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = `500 30px ${family}`;
  ctx.fillText("Belajar bareng buat siap ujian", W / 2, wordY + 52);

  // ── QR panel ──
  // White, with a real quiet zone. Contrast and margin are what a scanner
  // needs; everything else on this card is decoration around them.
  const panel = 660;
  const panelX = W / 2 - panel / 2;
  const panelY = wordY + 104;
  ctx.fillStyle = PAPER;
  roundRect(ctx, panelX, panelY, panel, panel, 44);
  ctx.fill();

  // 72px of white on every side. At this panel size that is ~5 modules of
  // quiet zone — scanners want at least 4, and below that they simply give up.
  const pad = 72;
  const cell = (panel - pad * 2) / count;
  const originX = panelX + pad;
  const originY = panelY + pad;
  ctx.fillStyle = "#000000";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        // +1 on the size closes the hairline seams canvas leaves between
        // adjacent fills, which some scanners read as broken modules.
        ctx.fillRect(
          Math.floor(originX + c * cell),
          Math.floor(originY + r * cell),
          Math.ceil(cell) + 1,
          Math.ceil(cell) + 1
        );
      }
    }
  }

  // ── Code + call to action ──
  const codeY = panelY + panel + 92;
  ctx.fillStyle = BRAND_1;
  ctx.font = `700 58px ${family}`;
  ctx.fillText(`@${code}`, W / 2, codeY);

  ctx.fillStyle = MUTED;
  ctx.font = `500 32px ${family}`;
  ctx.fillText("Scan atau buka haistudy.site/@" + code, W / 2, codeY + 54);
}

export function ReferralQr({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBusy(true);
    (async () => {
      // Wait for the webfonts, or the card renders in the fallback face and
      // stops looking like haistudy.
      try {
        await document.fonts?.ready;
      } catch {
        // Not supported — draw anyway.
      }
      if (!alive || !canvasRef.current) return;
      await drawCard(canvasRef.current, code);
      if (alive) setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, code]);

  const download = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `haistudy-${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [code]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 flex items-center gap-1.5 rounded text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <QrGlyph />
        {open ? "Sembunyikan QR" : "Tampilkan QR"}
      </button>

      {open && (
        <div className="mt-2 flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-4">
          <div className="relative w-full max-w-[280px]">
            <canvas
              ref={canvasRef}
              className="h-auto w-full rounded-xl"
              style={{ aspectRatio: `${W} / ${H}` }}
            />
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh PNG
          </button>
        </div>
      )}
    </>
  );
}

/** Inline so the card does not pull another icon into this route's bundle. */
function QrGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2z" />
    </svg>
  );
}
