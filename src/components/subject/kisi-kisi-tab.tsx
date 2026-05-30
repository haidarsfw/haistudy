"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Monitor, FileText, ExternalLink, X, Loader2, ClipboardList } from "lucide-react";
import type { KisiKisiItem, KisiKisiAttachment } from "@/types";
import { BookmarkButton } from "@/components/shared/bookmark-button";

interface KisiKisiTabProps {
  items: KisiKisiItem[];
  note?: string;
  info?: { label: string; value: string }[];
  attachments?: KisiKisiAttachment[];
  subjectId: string;
}

/** Build embed URL for Google Doc/Drive files */
function getEmbedUrl(driveId: string, type: string): string {
  if (type === "drive-gslides") {
    return `https://docs.google.com/presentation/d/${driveId}/embed?start=false&loop=false&delayms=0&rm=minimal&chrome=false`;
  }
  if (type === "drive-gdoc") {
    return `https://docs.google.com/document/d/${driveId}/preview`;
  }
  return `https://drive.google.com/file/d/${driveId}/preview`;
}

/** Build external link URL */
function getExternalUrl(driveId: string, type: string): string {
  if (type === "drive-gslides") {
    return `https://docs.google.com/presentation/d/${driveId}/edit`;
  }
  if (type === "drive-gdoc") {
    return `https://docs.google.com/document/d/${driveId}/edit`;
  }
  return `https://drive.google.com/file/d/${driveId}/view`;
}

export function KisiKisiTab({ items, note, info, attachments, subjectId }: KisiKisiTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(items.map((i) => i.topic))
  );

  const [previewAttachment, setPreviewAttachment] = useState<KisiKisiAttachment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Block copy/paste shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "u", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll when preview modal is open
  useEffect(() => {
    if (previewAttachment) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewAttachment]);

  // Loading timeout - hide spinner after 6s even if iframe never fires onLoad
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 6_000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const toggle = (topic: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const openPreview = useCallback((attachment: KisiKisiAttachment) => {
    setIsLoading(true);
    setPreviewAttachment(attachment);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewAttachment(null);
    setIsLoading(false);
  }, []);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Kisi-kisi belum tersedia untuk mata kuliah ini.
        </p>
        {note && (
          <div className="mx-auto mt-3 max-w-md rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-xs text-primary">
            {note}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className="copy-protected flex flex-col gap-3 py-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        {subjectId === "cbkwn" && (
          <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2.5">
            <Monitor className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Ujian mata kuliah ini dilaksanakan secara <span className="font-semibold">online</span>. Silakan kunjungi{" "}
              <a href="https://exam.apps.binus.ac.id" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">exam.apps.binus.ac.id</a>{" "}
              untuk informasi lebih lanjut.
            </p>
          </div>
        )}
        {/* Structured exam info + note combined */}
        {(info && info.length > 0 || note) && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <ClipboardList className="h-4 w-4 text-primary shrink-0" />
              <span className="font-heading text-sm font-semibold">Info Ujian</span>
            </div>
            <div className="px-4 py-2.5 space-y-1.5">
              {info?.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="font-medium text-foreground whitespace-nowrap">{item.label}:</span>
                  <span className="text-foreground/80">{item.value}</span>
                </div>
              ))}
              {note && (
                <p className="text-xs text-primary/80 pt-1 border-t border-border mt-2">
                  {note}
                </p>
              )}
            </div>
          </div>
        )}

        {items.map((item) => {
          const isExpanded = expanded.has(item.topic);
          return (
            <div
              key={item.topic}
              className="relative rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Topic header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggle(item.topic)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(item.topic); } }}
                className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors cursor-pointer select-none"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-heading text-base font-semibold flex-1">
                  {item.topic}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {item.items.length} item
                </span>
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <BookmarkButton
                    item={{
                      id: `kisi-${subjectId}-${item.topic}`,
                      type: "kisi-kisi",
                      subjectId,
                      title: item.topic,
                    }}
                  />
                </div>
              </div>

              {/* Items */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-2">
                  {item.items.map((subItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 py-2"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary/40 shrink-0" />
                      <span className="text-sm text-foreground/80">
                        {subItem}
                      </span>
                    </div>
                  ))}

                  {/* Attachments */}
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="mt-2 mb-1 flex flex-col gap-2">
                      <div className="w-full h-px bg-border" />
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        File Lampiran
                      </p>
                      {item.attachments.map((att, aidx) => (
                        <button
                          key={aidx}
                          onClick={() => openPreview(att)}
                          className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-sm active:scale-[0.99] cursor-pointer w-full"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {att.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Klik untuk preview • Google Docs
                            </p>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Standalone file attachments section */}
        {attachments && attachments.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pt-2">
              <div className="w-full h-px bg-border" />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              File Lampiran
            </p>
            {attachments.map((att, aidx) => (
              <button
                key={aidx}
                onClick={() => openPreview(att)}
                className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-sm active:scale-[0.99] cursor-pointer w-full"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {att.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Klik untuk preview • Google Docs
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal for Attachments */}
      {previewAttachment && (
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
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider block">
                  File Lampiran Kisi-Kisi
                </span>
                <h3 className="text-sm font-semibold truncate">
                  {previewAttachment.title}
                </h3>
              </div>
              <a
                href={getExternalUrl(previewAttachment.driveId, previewAttachment.type)}
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
                src={getEmbedUrl(previewAttachment.driveId, previewAttachment.type)}
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
