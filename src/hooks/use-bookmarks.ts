"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hs-bookmarks";

export interface BookmarkItem {
  id: string;
  type: "materi" | "flashcard" | "kisi-kisi";
  subjectId: string;
  title: string;
  createdAt: string;
}

function loadBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(items: BookmarkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  useEffect(() => {
    setBookmarks(loadBookmarks());
  }, []);

  const addBookmark = useCallback(
    (item: Omit<BookmarkItem, "createdAt">) => {
      const newItem: BookmarkItem = {
        ...item,
        createdAt: new Date().toISOString(),
      };
      const updated = [newItem, ...loadBookmarks().filter((b) => b.id !== item.id)];
      saveBookmarks(updated);
      setBookmarks(updated);
    },
    []
  );

  const removeBookmark = useCallback((id: string) => {
    const updated = loadBookmarks().filter((b) => b.id !== id);
    saveBookmarks(updated);
    setBookmarks(updated);
  }, []);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  return { bookmarks, addBookmark, removeBookmark, isBookmarked };
}
