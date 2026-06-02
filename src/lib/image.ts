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
