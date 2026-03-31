/**
 * Media URL detection and embed utilities for forum posts.
 */

export function detectMediaType(url: string): "youtube" | "google-slides" | null {
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
