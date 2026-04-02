"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { StickyNote, Cloud, CloudOff } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerItem } from "@/lib/motion";

const STORAGE_KEY = "hs-quick-note";

export function QuickNoteCard() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [note, setNote] = useState("");
  const [synced, setSynced] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load from localStorage first, then merge server data
  useEffect(() => {
    if (loadedRef.current || !session) return;
    loadedRef.current = true;

    const localKey = `${STORAGE_KEY}-${session.licenseKey}`;
    const local = localStorage.getItem(localKey) || "";
    if (local) setNote(local);

    // Fetch from server
    (async () => {
      try {
        const res = await fetch(`/api/settings?licenseKey=${encodeURIComponent(session.licenseKey)}`);
        const data = await res.json();
        const serverNote = data.settings?.notes?.__quickNote || "";
        if (serverNote && serverNote.length >= local.length) {
          setNote(serverNote);
          localStorage.setItem(localKey, serverNote);
        } else if (local && !serverNote) {
          // Push local to server
          syncToServer(local);
        }
        setSynced(true);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const syncToServer = useCallback(async (text: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/settings?licenseKey=${encodeURIComponent(session.licenseKey)}`);
      const data = await res.json();
      const allNotes = data.settings?.notes || {};
      const updated = { ...allNotes, __quickNote: text };
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: session.licenseKey, settings: { notes: updated } }),
      });
      setSynced(true);
    } catch {
      setSynced(false);
    }
  }, [session]);

  const handleChange = (value: string) => {
    setNote(value);
    setSynced(false);

    // Local save immediately with debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (session) localStorage.setItem(`${STORAGE_KEY}-${session.licenseKey}`, value);
    }, 300);

    // Server sync with longer debounce
    if (serverSyncRef.current) clearTimeout(serverSyncRef.current);
    serverSyncRef.current = setTimeout(() => {
      syncToServer(value);
    }, 2000);
  };

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-border bg-card p-4 transition-colors light-card-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <StickyNote className="h-4 w-4 text-amber-500" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">
          {t("dashboard.quick_note")}
        </span>
        {synced ? (
          <Cloud className="h-3 w-3 text-green-500" />
        ) : (
          <CloudOff className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
      <textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("dashboard.quick_note_placeholder")}
        className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none h-[60px]"
      />
    </motion.div>
  );
}
