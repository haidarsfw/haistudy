"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Library as LibraryIcon,
  Trash2,
  Copy,
  Lock,
  Bookmark,
  FileText,
  BookOpen as BookOpenIcon,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { useScope } from "@/components/providers/scope-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { canUseVipFeatures } from "@/lib/tier";
import type { HighlightColor, SnippetLibraryItem } from "@/types";
import { toast } from "@/components/ui/toast";

const COLOR_DOT: Record<HighlightColor, string> = {
  yellow: "bg-yellow-400",
  blue: "bg-blue-400",
  green: "bg-emerald-400",
  pink: "bg-pink-400",
  red: "bg-red-400",
};

export default function LibraryPage() {
  const { session } = useSession();
  const { scopePath } = useScope();
  const { subjects } = useScopedData();
  const { t } = useTranslation();
  const router = useRouter();
  const canVip = canUseVipFeatures(session);

  const { bookmarks, removeBookmark } = useBookmarks();

  const [snippets, setSnippets] = useState<SnippetLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("all");

  const subjectName = useCallback(
    (id: string | null) => subjects.find((s) => s.id === id)?.name ?? id ?? "",
    [subjects]
  );

  useEffect(() => {
    if (!canVip) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/snippets")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSnippets(Array.isArray(data.snippets) ? data.snippets : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canVip]);

  const subjectsWithSnippets = useMemo(() => {
    const ids = new Set(snippets.map((s) => s.subjectId).filter(Boolean) as string[]);
    return subjects.filter((s) => ids.has(s.id));
  }, [snippets, subjects]);

  const filtered = useMemo(() => {
    if (filterSubject === "all") return snippets;
    return snippets.filter((s) => s.subjectId === filterSubject);
  }, [snippets, filterSubject]);

  // Bookmarks grouped by subject.
  const groupedBookmarks = useMemo(
    () =>
      subjects
        .map((subject) => ({
          subject,
          items: bookmarks.filter((b) => b.subjectId === subject.id),
        }))
        .filter((g) => g.items.length > 0),
    [subjects, bookmarks]
  );

  const bookmarkTypeLabels: Record<string, { label: string; icon: typeof FileText }> =
    {
      materi: { label: t("bookmarks.tab_materi"), icon: FileText },
      flashcard: { label: t("bookmarks.tab_flashcard"), icon: BookOpenIcon },
      "kisi-kisi": { label: t("bookmarks.tab_kisi"), icon: ClipboardList },
    };

  const handleBookmarkClick = (item: (typeof bookmarks)[0]) => {
    const tabMap: Record<string, number> = {
      materi: 0,
      flashcard: 3,
      "kisi-kisi": 2,
    };
    const tab = tabMap[item.type] ?? 0;
    router.push(`/${scopePath}/subject/${item.subjectId}?tab=${tab}`);
  };

  // Issue 11: jump to a snippet's source rangkuman module and glow the quote.
  // Rangkuman is tab index 1; the subject page reads `tab` as a number.
  const handleSnippetClick = (snip: SnippetLibraryItem) => {
    if (!snip.subjectId) return;
    const params = new URLSearchParams({ tab: "1" });
    if (snip.sourceModule) params.set("module", snip.sourceModule);
    if (snip.snippetText) params.set("highlight", snip.snippetText);
    router.push(`/${scopePath}/subject/${snip.subjectId}?${params.toString()}`);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("library.copied"));
    } catch {
      toast.error(t("profile.upload_error"));
    }
  };

  const handleDelete = async (id: string) => {
    const prev = snippets;
    setSnippets((s) => s.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast.success(t("library.deleted"));
    } catch {
      setSnippets(prev);
      toast.error(t("profile.save_error"));
    }
  };

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <LibraryIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("library.title")}</h1>
        </div>
      </div>

      {/* ─── Bookmarks section (all users) ─── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">
            {t("library.section_bookmarks")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {bookmarks.length} {t("bookmarks.items_saved")}
          </span>
        </div>

        {bookmarks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Bookmark
                className="mb-2 h-9 w-9 text-muted-foreground/30"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                {t("bookmarks.empty")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {groupedBookmarks.map(({ subject, items }) => (
              <div key={subject.id}>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                  {subject.name}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => {
                    const typeInfo =
                      bookmarkTypeLabels[item.type] || bookmarkTypeLabels.materi;
                    const Icon = typeInfo.icon;
                    return (
                      <Card
                        key={item.id}
                        className="cursor-pointer transition-colors hover:border-primary/20"
                        onClick={() => handleBookmarkClick(item)}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm">
                            {item.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px]"
                          >
                            {typeInfo.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBookmark(item.id);
                              toast.success(t("bookmarks.deleted"));
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Snippets section (VIP-only) ─── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <LibraryIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">
            {t("library.section_snippets")}
          </h2>
          {canVip && (
            <span className="text-xs text-muted-foreground">
              {t("library.count").replace("{count}", String(snippets.length))}
            </span>
          )}
        </div>

        {!canVip ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Lock
                className="h-9 w-9 text-muted-foreground/40"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                {t("library.snippets_vip_only")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Subject filter */}
            {subjectsWithSnippets.length > 0 && (
              <div className="scrollbar-thin mb-4 flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilterSubject("all")}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterSubject === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("library.all_subjects")}
                </button>
                {subjectsWithSnippets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterSubject(s.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filterSubject === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.shortName || s.name}
                  </button>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-16 w-full !rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <LibraryIcon
                    className="h-9 w-9 text-muted-foreground/30"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("library.empty")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("library.empty_hint")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((snip) => (
                  <Card
                    key={snip.id}
                    className={`group ${snip.subjectId ? "cursor-pointer transition-colors hover:border-primary/20" : ""}`}
                    onClick={snip.subjectId ? () => handleSnippetClick(snip) : undefined}
                    title={snip.subjectId ? t("library.jump_to_source") : undefined}
                  >
                    <CardContent className="flex items-start gap-3 p-3">
                      <span
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                          snip.color ? COLOR_DOT[snip.color] : "bg-muted-foreground/40"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {snip.snippetText}
                        </p>
                        {snip.subjectId && (
                          <Badge variant="secondary" className="mt-1.5 text-[10px]">
                            {t("library.from_subject").replace(
                              "{subject}",
                              subjectName(snip.subjectId)
                            )}
                          </Badge>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); handleCopy(snip.snippetText); }}
                          title={t("library.copy")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(snip.id); }}
                          title={t("library.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
