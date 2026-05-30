"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookmarks, type BookmarkItem } from "@/hooks/use-bookmarks";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "@/components/ui/toast";
import { sounds } from "@/lib/sounds";

interface BookmarkButtonProps {
  item: Omit<BookmarkItem, "createdAt">;
  size?: "sm" | "icon";
}

export function BookmarkButton({ item, size = "icon" }: BookmarkButtonProps) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { t } = useTranslation();

  const bookmarked = isBookmarked(item.id);

  const handleToggle = () => {
    sounds.toggle();
    if (bookmarked) {
      removeBookmark(item.id);
      toast.success(t("bookmarks.deleted"));
    } else {
      addBookmark(item);
      toast.success(t("bookmarks.added"));
    }
  };

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : "icon"}
      className={`h-7 w-7 shrink-0 ${bookmarked ? "text-primary" : "text-muted-foreground"}`}
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
    >
      <Bookmark
        className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`}
      />
    </Button>
  );
}
