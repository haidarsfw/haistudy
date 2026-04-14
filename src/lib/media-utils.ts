/**
 * Media URL detection and embed utilities for forum posts.
 */

export type MediaType = "youtube" | "google-slides" | "google-pdf" | null;

export function detectMediaType(url: string): MediaType {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "youtu.be" ||
      u.hostname === "m.youtube.com"
    ) {
      return "youtube";
    }
    if (
      u.hostname === "docs.google.com" &&
      u.pathname.includes("/presentation")
    ) {
      return "google-slides";
    }
    // Google Drive file viewer / pdf
    if (
      (u.hostname === "drive.google.com" && u.pathname.includes("/file/d/")) ||
      (u.hostname === "docs.google.com" && u.pathname.includes("/document/")) ||
      (u.hostname === "docs.google.com" && u.pathname.includes("/spreadsheets/"))
    ) {
      return "google-pdf";
    }
  } catch {
    // Invalid URL
  }
  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    } else if (u.searchParams.has("v")) {
      videoId = u.searchParams.get("v");
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export function getGoogleSlidesEmbedUrl(url: string): string | null {
  try {
    const match = url.match(
      /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/
    );
    if (match) {
      return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

export function getGoogleDriveEmbedUrl(url: string): string | null {
  try {
    // Google Drive file: drive.google.com/file/d/FILE_ID/...
    const driveMatch = url.match(
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
    );
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    // Google Docs: docs.google.com/document/d/FILE_ID/...
    const docMatch = url.match(
      /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/
    );
    if (docMatch) {
      return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
    }
    // Google Sheets: docs.google.com/spreadsheets/d/FILE_ID/...
    const sheetMatch = url.match(
      /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
    );
    if (sheetMatch) {
      return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`;
    }
  } catch {
    // Invalid URL
  }
  return null;
}
