"use client";

import { ExternalLink, Maximize2, Download, FileCode2 } from "lucide-react";
import {
  detectMediaType,
  getYouTubeEmbedUrl,
  getGoogleSlidesEmbedUrl,
  getGoogleDriveEmbedUrl,
} from "@/lib/media-utils";

interface MediaEmbedProps {
  url: string;
  onExpand?: (url: string, type: "image" | "iframe") => void;
}

export function MediaEmbed({ url, onExpand }: MediaEmbedProps) {
  const type = detectMediaType(url);

  if (type === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (embedUrl) {
      return (
        <div className="group relative mt-3 w-full overflow-hidden rounded-lg pt-[56.25%]">
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
          {onExpand && (
            <button
              onClick={() => onExpand(embedUrl, "iframe")}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }
  }

  if (type === "google-slides") {
    const embedUrl = getGoogleSlidesEmbedUrl(url);
    if (embedUrl) {
      return (
        <div className="group relative mt-3 w-full overflow-hidden rounded-lg pt-[60%]">
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            title="Google Slides"
          />
          {onExpand && (
            <button
              onClick={() => onExpand(embedUrl, "iframe")}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }
  }

  if (type === "google-pdf") {
    const embedUrl = getGoogleDriveEmbedUrl(url);
    if (embedUrl) {
      return (
        <div className="group relative mt-3 w-full overflow-hidden rounded-lg pt-[75%]">
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            title="Google Drive Document"
          />
          {onExpand && (
            <button
              onClick={() => onExpand(embedUrl, "iframe")}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }
  }

  // Local HTML file: show dedicated open + download card
  const isLocalHtml = url.startsWith("/") && /\.html?($|\?)/i.test(url);
  if (isLocalHtml) {
    const filename = url.split("/").pop()?.split("?")[0] || "file.html";
    return (
      <div className="mt-3 rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-2 text-sm">
          <FileCode2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-medium">{filename}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
            HTML
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka di Browser
          </a>
          <a
            href={url}
            download={filename}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </div>
    );
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
      {url.length > 60 ? url.slice(0, 57) + "..." : url}
    </a>
  );
}
