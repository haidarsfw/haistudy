/**
 * Client-side Cloudinary upload utility.
 * Uses unsigned upload preset - no server route needed.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Compress image client-side before upload.
 * Returns a Blob with max dimensions and quality settings.
 */
function compressImage(
  file: File,
  maxWidth = 2048,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        mimeType,
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a file to Cloudinary.
 * @param file The file to upload
 * @param resourceType "image" (default) or "video" (for audio/video files)
 * Returns the secure URL or null on failure.
 */
export async function uploadToCloudinary(
  file: File,
  resourceType: "image" | "video" | "auto" = "image"
): Promise<string | null> {
  if (!CLOUD_NAME) {
    throw new Error(
      "Cloudinary upload failed: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. " +
        "Add it to your .env.local file."
    );
  }
  if (!UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary upload failed: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not set. " +
        "Add it to your .env.local file."
    );
  }

  try {
    const formData = new FormData();

    if (resourceType === "image") {
      const compressed = await compressImage(file);
      formData.append("file", compressed, file.name);
    } else {
      formData.append("file", file, file.name);
    }

    formData.append("upload_preset", UPLOAD_PRESET);

    // Try primary resource type
    let res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      { method: "POST", body: formData }
    );

    // If auto/video fails, try fallback resource types
    if (!res.ok && resourceType !== "image") {
      const fallbacks = ["video", "raw", "auto"].filter((t) => t !== resourceType);
      for (const fallback of fallbacks) {
        const retryForm = new FormData();
        retryForm.append("file", file, file.name);
        retryForm.append("upload_preset", UPLOAD_PRESET);
        res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${fallback}/upload`,
          { method: "POST", body: retryForm }
        );
        if (res.ok) break;
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Cloudinary upload error:", res.status, errorData);
      return null;
    }

    const data = await res.json();
    return data.secure_url || null;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return null;
  }
}
