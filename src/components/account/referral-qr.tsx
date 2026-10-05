"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "@/components/ui/icons";

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
// Not #ffffff. The research that says "dark on light" also says the light does
// not have to be white — deep green on a pale, warm ground scans identically
// and stops the card reading as a printer test page. Contrast is what matters,
// and near-black on this is far past the threshold.
const PAPER = "#f4f8f5";
const MODULE = "#0a1310";
const MUTED = "#8aa79c";
const DIM = "#5f7a71";

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

  // Level H, 30% recovery. Not decoration: a logo sits in the middle of this
  // code, and at level M that cover would eat real data. A centred mark is
  // worth the larger grid — a QR people recognise as yours is scanned far more
  // often than an anonymous square, because an unmarked code now reads as
  // something that might be a scam.
  const qr = qrcode(0, "H");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;
  const family = fontStack();
  const M = 96; // page margin

  // ── Ground ──
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, INK_2);
  bg.addColorStop(1, INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const wash = ctx.createRadialGradient(W, 0, 0, W, 0, 1000);
  wash.addColorStop(0, "rgba(16,185,129,0.16)");
  wash.addColorStop(1, "rgba(16,185,129,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // ── Header, left-aligned. Centring every line is what made the first version
  //    read as a template; an anchored edge gives the eye somewhere to start. ──
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const markSize = 54;
  const scale = markSize / MARK_VIEWBOX.w;
  ctx.save();
  ctx.translate(M, M + 4);
  ctx.scale(scale, scale);
  ctx.translate(-MARK_VIEWBOX.x, -MARK_VIEWBOX.y);
  const markGrad = ctx.createLinearGradient(520, 560, 1520, 1500);
  markGrad.addColorStop(0, BRAND_1);
  markGrad.addColorStop(1, BRAND_2);
  ctx.fillStyle = markGrad;
  for (const d of MARK_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();

  const wordY = M + 44;
  ctx.font = `700 42px ${family}`;
  const wHai = ctx.measureText("hai").width;
  ctx.fillStyle = BRAND_1;
  ctx.fillText("hai", M + markSize + 18, wordY);
  ctx.fillStyle = "#eef4f1";
  ctx.fillText("study", M + markSize + 18 + wHai, wordY);

  // ── QR panel. Centred, because a code that is not square to the frame reads
  //    as an accident, and because this is the only thing on the card with a
  //    job. ──
  const panel = W - M * 2;
  const panelX = M;
  const panelY = 206;
  ctx.fillStyle = PAPER;
  roundRect(ctx, panelX, panelY, panel, panel, 56);
  ctx.fill();

  // ~11% of the panel per side. The floor is 4 modules; the guidance is
  // 10-15% of total width, and clutter inside it is what stops a scan.
  const pad = Math.round(panel * 0.11);
  const cell = (panel - pad * 2) / count;
  const originX = panelX + pad;
  const originY = panelY + pad;
  ctx.fillStyle = MODULE;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        // +1 closes the hairline seams canvas leaves between adjacent fills,
        // which a scanner can read as a broken module.
        ctx.fillRect(
          Math.floor(originX + c * cell),
          Math.floor(originY + r * cell),
          Math.ceil(cell) + 1,
          Math.ceil(cell) + 1
        );
      }
    }
  }

  // ── The mark, in the middle of the code ──
  // Kept to ~19% of the code's width. Level H recovers 30%, so this is well
  // inside what the code can lose and still be read.
  const codeSide = panel - pad * 2;
  const holeSide = Math.round(codeSide * 0.19);
  const holeX = originX + codeSide / 2 - holeSide / 2;
  const holeY = originY + codeSide / 2 - holeSide / 2;
  ctx.fillStyle = PAPER;
  roundRect(ctx, holeX - 10, holeY - 10, holeSide + 20, holeSide + 20, 22);
  ctx.fill();

  const inner = holeSide * 0.82;
  const s2 = inner / MARK_VIEWBOX.w;
  ctx.save();
  ctx.translate(holeX + (holeSide - inner) / 2, holeY + (holeSide - inner) / 2);
  ctx.scale(s2, s2);
  ctx.translate(-MARK_VIEWBOX.x, -MARK_VIEWBOX.y);
  const g2 = ctx.createLinearGradient(520, 560, 1520, 1500);
  g2.addColorStop(0, BRAND_2);
  g2.addColorStop(1, "#065f46");
  ctx.fillStyle = g2;
  for (const d of MARK_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();

  // ── Footer. Two sizes, not one: the handle is what someone reads across a
  //    room, the URL is what they type. Same weight everywhere was the flatness. ──
  // Measured, not guessed: panel bottom + this + the caption offset has to land
  // inside H with room to breathe. The first pass put the last line at 1360px
  // on a 1350px card and simply cut it off.
  const footY = panelY + panel + 96;
  ctx.textAlign = "left";
  ctx.fillStyle = "#eef4f1";
  ctx.font = `700 68px ${family}`;
  ctx.fillText(`@${code}`, M, footY);

  ctx.fillStyle = DIM;
  ctx.font = `500 30px ${family}`;
  ctx.fillText(`haistudy.site/@${code.toLowerCase()}`, M, footY + 44);

  // A single hairline instead of a third sentence.
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, footY + 78);
  ctx.lineTo(W - M, footY + 78);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = `500 27px ${family}`;
  ctx.fillText("Scan buat gabung", M, footY + 122);
}

export function ReferralQr({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBusy(true);
    setFailed(false);
    (async () => {
      // Wait for the webfonts, or the card renders in the fallback face and
      // stops looking like haistudy.
      try {
        await document.fonts?.ready;
      } catch {
        // Not supported — draw anyway.
      }
      if (!alive || !canvasRef.current) return;
      try {
        await drawCard(canvasRef.current, code);
      } catch {
        // The encoder is a lazily loaded chunk; on a flaky connection it can
        // fail to arrive. Without this the spinner turned forever and the
        // download button stayed disabled, with nothing on screen to say why.
        if (alive) setFailed(true);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, code, attempt]);

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
      // Revoked later, not straight after the click. Safari on iOS reads the
      // blob after this handler returns, and revoking it synchronously could
      // cancel the very download the owner asked for: PNG exists here
      // precisely because most people open this on a phone.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }, "image/png");
  }, [code]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        // min-h-11: on a phone this toggle is a real control, not a footnote.
        className="mt-1 flex min-h-11 items-center gap-1.5 rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
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
            {failed && !busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/90 px-4 text-center">
                <p className="text-xs text-muted-foreground">
                  QR belum bisa dibuat. Biasanya karena koneksi.
                </p>
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="min-h-11 rounded-full border border-border px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Coba lagi
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={download}
            disabled={busy || failed}
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
