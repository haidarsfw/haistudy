/**
 * Client-side image helpers for the avatar cropper:
 *  - isHeic(): detect HEIC/HEIF (iPhone photos) by mime OR extension. iOS often
 *    reports an empty `file.type`, so the extension check is the reliable path.
 *  - heicToJpeg(): lazy-convert HEIC to a JPEG File. heic2any is dynamic-imported
 *    so it never enters the initial bundle - only loaded when a HEIC is picked.
 *  - getCroppedBlob(): render a react-easy-crop pixel area into a square canvas.
 * All canvas/Image work is browser-only (guarded where it matters).
 */

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isHeic(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

export async function heicToJpeg(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(out) ? out[0] : out;
  const base = file.name.replace(/\.\w+$/, "") || "avatar";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Draw the cropped pixel region (from react-easy-crop's onCropComplete) into a
 * square `outSize x outSize` canvas and return it as a Blob. The circular mask
 * is purely a display concern, so the stored image stays a full square.
 */
export async function getCroppedBlob(
  src: string,
  area: PixelArea,
  outSize = 512,
  mime = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outSize,
    outSize
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      mime,
      quality
    );
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

/**
 * Aggressively compress a user-picked image down to a byte budget for upload
 * (payment / share proofs). Converts HEIC → JPEG first (iPhone screenshots),
 * downscales the long edge, then steps quality down until under `maxBytes`.
 * Browser-only; returns the original file if run server-side or on failure.
 */
export async function compressImageToBudget(
  file: File,
  opts?: { maxBytes?: number; maxDimension?: number; mime?: string }
): Promise<File> {
  const maxBytes = opts?.maxBytes ?? 500 * 1024;
  let maxDim = opts?.maxDimension ?? 1600;
  const mime = opts?.mime ?? "image/jpeg";
  if (typeof window === "undefined") return file;

  // iPhone HEIC → JPEG before any canvas work.
  const working = isHeic(file) ? await heicToJpeg(file) : file;

  const url = URL.createObjectURL(working);
  try {
    const img = await loadImage(url);
    const base = working.name.replace(/\.\w+$/, "") || "proof";

    const render = (targetDim: number, quality: number): Promise<Blob | null> => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      const longest = Math.max(w, h);
      if (longest > targetDim) {
        const scale = targetDim / longest;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return Promise.resolve(null);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      return canvasToBlob(canvas, mime, quality);
    };

    // Quality ladder at the initial dimension.
    let quality = 0.85;
    let blob = await render(maxDim, quality);
    while (blob && blob.size > maxBytes && quality > 0.4) {
      quality -= 0.12;
      blob = await render(maxDim, quality);
    }
    // Still over budget → shrink the long edge and try once more.
    if (blob && blob.size > maxBytes) {
      maxDim = 1100;
      blob = await render(maxDim, 0.72);
    }

    if (!blob) return working;
    return new File([blob], `${base}.jpg`, { type: mime });
  } catch {
    return working;
  } finally {
    URL.revokeObjectURL(url);
  }
}
