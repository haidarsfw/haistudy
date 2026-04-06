"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ExternalLink, FileText, Presentation, X, Loader2 } from "lucide-react";
import type { MateriItem } from "@/types";
import { BookmarkButton } from "@/components/shared/bookmark-button";

interface MateriTabProps {
  items: MateriItem[];
  completedIds: number[];
  onToggleComplete: (id: number, completed: boolean) => void;
  subjectId: string;
  highlightTitle?: string;
}

const typeIcons: Record<string, typeof FileText> = {
  slides: Presentation,
  pdf: FileText,
  "drive-pptx": Presentation,
  "drive-pdf": FileText,
  "drive-gslides": Presentation,
  "drive-gdoc": FileText,
};

/** Build embed URL - Google Slides use /embed, others use Drive preview */
function getEmbedUrl(driveId: string, type: string): string {
  if (type === "drive-gslides" || type === "slides") {
    return `https://docs.google.com/presentation/d/${driveId}/embed?start=false&loop=false&delayms=0&rm=minimal&chrome=false`;
  }
  return `https://drive.google.com/file/d/${driveId}/preview`;
}

export function MateriTab({
  items,
  subjectId,
  highlightTitle,
}: MateriTabProps) {
  const [previewItem, setPreviewItem] = useState<MateriItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preloadedDriveId, setPreloadedDriveId] = useState<string | null>(null);
  const preloadIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Highlight + scroll to matching materi item from search
  useEffect(() => {
    if (!highlightTitle) return;
    const match = items.find((i) => i.title === highlightTitle);
    if (!match) return;
    setHighlightId(match.id);
    // Scroll to the element after render
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-materi-id="${match.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    // Clear highlight after 4s
    const fadeTimer = setTimeout(() => setHighlightId(null), 4000);
    return () => { clearTimeout(timer); clearTimeout(fadeTimer); };
  }, [highlightTitle, items]);

  const openPreview = useCallback((item: MateriItem) => {
    if (item.driveId === "PLACEHOLDER") return;
    // If this is the preloaded item, skip the loading spinner
    if (item.driveId === preloadedDriveId) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setPreviewItem(item);
  }, [preloadedDriveId]);

  const closePreview = useCallback(() => {
    setPreviewItem(null);
    setIsLoading(false);
  }, []);

  // Preconnect to Google domains + pre-load first item's iframe in background
  useEffect(() => {
    const origins = [
      "https://docs.google.com",
      "https://drive.google.com",
      "https://lh3.googleusercontent.com",
      "https://accounts.google.com",
      "https://fonts.googleapis.com",
    ];
    const links: HTMLLinkElement[] = [];
    origins.forEach((origin) => {
      // preconnect
      if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const preconnect = document.createElement("link");
        preconnect.rel = "preconnect";
        preconnect.href = origin;
        preconnect.crossOrigin = "anonymous";
        document.head.appendChild(preconnect);
        links.push(preconnect);
      }
      // dns-prefetch
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) {
        const dns = document.createElement("link");
        dns.rel = "dns-prefetch";
        dns.href = origin;
        document.head.appendChild(dns);
        links.push(dns);
      }
    });

    // Pre-load the first non-placeholder item's iframe in the background
    const firstItem = items.find((i) => i.driveId !== "PLACEHOLDER");
    if (firstItem) {
      const embedUrl = getEmbedUrl(firstItem.driveId, firstItem.type);

      // Create a hidden iframe that loads in the background
      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.style.position = "absolute";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.overflow = "hidden";
      iframe.style.border = "none";
      iframe.setAttribute("loading", "eager");
      iframe.setAttribute("tabindex", "-1");
      iframe.setAttribute("aria-hidden", "true");
      iframe.onload = () => {
        setPreloadedDriveId(firstItem.driveId);
      };
      document.body.appendChild(iframe);
      preloadIframeRef.current = iframe;
    }

    return () => {
      links.forEach((l) => l.remove());
      // Clean up preloaded iframe
      if (preloadIframeRef.current) {
        preloadIframeRef.current.remove();
        preloadIframeRef.current = null;
      }
    };
  }, [items]);

  // Lock body scroll when preview modal is open
  useEffect(() => {
    if (previewItem) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewItem]);

  // Loading timeout — hide spinner after 6s even if iframe never fires onLoad
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 6_000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada materi untuk mata kuliah ini.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 py-4">
        {items.map((item) => {
          const TypeIcon = typeIcons[item.type] || FileText;
          const isPlaceholder = item.driveId === "PLACEHOLDER";

          return (
            <div
              key={item.id}
              data-materi-id={item.id}
              role="button"
              tabIndex={isPlaceholder ? -1 : 0}
              aria-disabled={isPlaceholder}
              onClick={() => !isPlaceholder && openPreview(item)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isPlaceholder) {
                  e.preventDefault();
                  openPreview(item);
                }
              }}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all text-left w-full ${
                highlightId === item.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md"
                  : isPlaceholder
                    ? "border-border bg-card/50 opacity-60 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-md cursor-pointer active:scale-[0.99]"
              }`}
            >
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {item.session && (
                  <span className="text-[11px] font-semibold text-primary/70 uppercase tracking-wider">
                    Sesi {item.session}
                  </span>
                )}
                <p className="text-sm font-medium truncate leading-snug">
                  {item.title}
                </p>
                {isPlaceholder && (
                  <span className="text-[10px] text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </div>

              {/* Bookmark (stop propagation to prevent opening preview) */}
              <div onClick={(e) => e.stopPropagation()}>
                <BookmarkButton
                  item={{
                    id: `materi-${subjectId}-${item.id}`,
                    type: "materi",
                    subjectId,
                    title: item.title,
                  }}
                />
              </div>
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground text-center mt-2">
          {items.length} materi tersedia
        </p>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closePreview}
        >
          <div
            className="relative flex flex-col w-[95vw] h-[90vh] max-w-6xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/50">
              <Presentation className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                {previewItem.session && (
                  <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider block">
                    Sesi {previewItem.session}
                  </span>
                )}
                <h3 className="text-sm font-semibold truncate">
                  {previewItem.title}
                </h3>
              </div>
              <a
                href={`https://docs.google.com/presentation/d/${previewItem.driveId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Buka di Google Drive"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Buka</span>
              </a>
              <button
                onClick={closePreview}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Tutup preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Iframe embed */}
            <div className="relative flex-1 min-h-0 bg-muted overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat preview...</p>
                  </div>
                </div>
              )}
              <iframe
                src={getEmbedUrl(previewItem.driveId, previewItem.type)}
                className="absolute inset-0 w-full"
                allowFullScreen
                loading="eager"
                onLoad={() => setIsLoading(false)}
                style={{ border: "none", height: "100%" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
