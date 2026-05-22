"use client";

import { motion } from "framer-motion";
import { Bookmark, Trash2, FileText, BookOpen as BookOpenIcon, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { toast } from "sonner";

export default function BookmarksPage() {
  const { session } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const { bookmarks, removeBookmark } = useBookmarks();
  const { subjects } = useScopedData();

  if (!session) return null;

  const typeLabels: Record<string, { label: string; icon: typeof FileText }> = {
    materi: { label: t("bookmarks.tab_materi"), icon: FileText },
    flashcard: { label: t("bookmarks.tab_flashcard"), icon: BookOpenIcon },
    "kisi-kisi": { label: t("bookmarks.tab_kisi"), icon: ClipboardList },
  };

  // Group by subject
  const grouped = subjects
    .map((subject) => ({
      subject,
      items: bookmarks.filter((b) => b.subjectId === subject.id),
    }))
    .filter((g) => g.items.length > 0);

  const handleClick = (item: (typeof bookmarks)[0]) => {
    // Navigate to subject page with correct tab
    const tabMap: Record<string, number> = {
      materi: 0,
      flashcard: 3,
      "kisi-kisi": 2,
    };
    const tab = tabMap[item.type] ?? 0;
    router.push(`/subject/${item.subjectId}?tab=${tab}`);
  };

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-6"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Bookmark className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("bookmarks.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {bookmarks.length} {t("bookmarks.items_saved")}
          </p>
        </div>
      </motion.div>

      {bookmarks.length === 0 ? (
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t("bookmarks.empty")}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ subject, items }) => (
            <motion.div key={subject.id} variants={staggerItem}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                {subject.name}
              </h2>
              <div className="space-y-2">
                {items.map((item) => {
                  const typeInfo = typeLabels[item.type] || typeLabels.materi;
                  const Icon = typeInfo.icon;

                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:border-primary/20 transition-colors"
                      onClick={() => handleClick(item)}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm truncate">
                          {item.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
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
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
