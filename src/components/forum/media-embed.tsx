"use client";

import { ExternalLink } from "lucide-react";
import {
  detectMediaType,
  getYouTubeEmbedUrl,
  getGoogleSlidesEmbedUrl,
} from "@/lib/media-utils";

interface MediaEmbedProps {
  url: string;
}

export function MediaEmbed({ url }: MediaEmbedProps) {
  const type = detectMediaType(url);

  if (type === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (embedUrl) {
      return (
        <div className="relative mt-3 w-full overflow-hidden rounded-lg pt-[56.25%]">
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
        </div>
      );
    }
  }

  if (type === "google-slides") {
    const embedUrl = getGoogleSlidesEmbedUrl(url);
    if (embedUrl) {
      return (
        <div className="relative mt-3 w-full overflow-hidden rounded-lg pt-[60%]">
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            title="Google Slides"
          />
        </div>
      );
    }
  }

  // Fallback: clickable link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {url}
    </a>
  );
}
