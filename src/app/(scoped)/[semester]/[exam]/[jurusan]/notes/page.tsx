"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { StickyNote, BookOpen, Save, Loader2, Cloud, CloudOff, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useScope } from "@/components/providers/scope-provider";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { Textarea } from "@/components/ui/textarea";
import { NoteMarkdown } from "@/components/shared/note-markdown";
import { staggerContainer, staggerItem } from "@/lib/motion";

const GENERAL_NOTES_KEY = "hs-notes-general";

export default function NotesPage() {
  const { session } = useSession();
  const { t } = useTranslation();
  const { subjects } = useScopedData();
  const { scopePath, scopeKey } = useScope();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  // This scope's notes map from the server (subjectId/__generalNote → text), used
  // to mark which subjects have notes even on a fresh device.
  const [scopeNotes, setScopeNotes] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const serverSyncRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loadedRef = useRef(false);

  const storageKey = session
    ? `${GENERAL_NOTES_KEY}::${session.licenseKey}::${scopeKey}`
    : GENERAL_NOTES_KEY;

  // Load notes - server first, then localStorage fallback
  useEffect(() => {
    if (loadedRef.current || !session) return;
    loadedRef.current = true;

    const local = localStorage.getItem(storageKey) || "";
    if (local) setContent(local);

    (async () => {
      try {
        const res = await fetch(`/api/settings`);
        const data = await res.json();
        // notes are nested by scope-key; read only this scope's map.
        const scopeMap =
          (data.settings?.notes?.[scopeKey] as Record<string, string>) || {};
        setScopeNotes(scopeMap);
        const serverNote = scopeMap.__generalNote || "";
        if (serverNote && serverNote.length >= local.length) {
          setContent(serverNote);
          localStorage.setItem(storageKey, serverNote);
        } else if (local && !serverNote) {
          syncToServer(local);
        }
        setSynced(true);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, storageKey, scopeKey]);

  const syncToServer = useCallback(async (text: string) => {
    if (!session || !scopeKey) return;
    try {
      const res = await fetch(`/api/settings`);
      const data = await res.json();
      const scopeMap =
        (data.settings?.notes?.[scopeKey] as Record<string, string>) || {};
      const updated = { ...scopeMap, __generalNote: text };
      // Server merges this under notes[scopeKey], leaving other scopes intact.
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeKey, settings: { notes: updated } }),
      });
      setScopeNotes(updated);
      setSynced(true);
    } catch {
      setSynced(false);
    }
  }, [session, scopeKey]);

  // Auto-save with debounce
  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
      setSynced(false);

      // Local save with short debounce
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaving(true);
        localStorage.setItem(storageKey, value);
        setLastSaved(new Date());
        setTimeout(() => setSaving(false), 300);
      }, 800);

      // Server sync with longer debounce
      if (serverSyncRef.current) clearTimeout(serverSyncRef.current);
      serverSyncRef.current = setTimeout(() => {
        syncToServer(value);
      }, 2000);
    },
    [storageKey, syncToServer]
  );

  // Check which subjects have notes (localStorage for this device + server map).
  const subjectNoteCounts = subjects.map((subject) => {
    const key = `hs-notes::${session?.licenseKey || ""}::${scopeKey}::${subject.id}`;
    let hasNotes = false;
    try {
      const val = localStorage.getItem(key);
      hasNotes = !!val && val.trim().length > 0;
    } catch {}
    const serverVal = scopeNotes[subject.id];
    if (!hasNotes && serverVal && serverVal.trim().length > 0) hasNotes = true;
    return { subject, hasNotes };
  });

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-6 space-y-8"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={staggerItem}>
        <h1 className="font-heading text-xl font-bold flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          {t("notes.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("notes.general_placeholder")}
        </p>
      </motion.div>

      {/* General notes editor */}
      <motion.section variants={staggerItem} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">
            {t("notes.general_title")}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {synced ? (
              <Cloud className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <CloudOff className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            {saving && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("notes.saving")}
              </span>
            )}
            {!saving && lastSaved && (
              <span className="flex items-center gap-1">
                <Save className="h-3 w-3" />
                {t("notes.saved")}
              </span>
            )}
          </div>
        </div>
        {/* Tulis | Pratinjau — renders Markdown & LaTeX. */}
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                !showPreview ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pencil className="h-3 w-3" /> Tulis
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                showPreview ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" /> Pratinjau
            </button>
          </div>
        </div>
        {showPreview ? (
          <div className="min-h-[200px] rounded-md border border-input bg-background px-3.5 py-3">
            <NoteMarkdown content={content} />
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t("notes.general_placeholder")}
            className="min-h-[200px] resize-y"
          />
        )}
      </motion.section>

      {/* Per-subject notes links */}
      <motion.section variants={staggerItem} className="space-y-3">
        <h2 className="font-heading text-base font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          {t("notes.per_subject")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjectNoteCounts.map(({ subject, hasNotes }) => (
            <Link
              key={subject.id}
              href={`/${scopePath}/subject/${subject.id}?tab=6`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20 hover:shadow-warm-lg"
            >
              <SubjectIcon
                icon={subject.icon}
                className={`h-8 w-8 shrink-0 ${subject.color}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{subject.name}</p>
                <p className="text-xs text-muted-foreground">
                  {hasNotes ? t("notes.has_notes") : t("notes.no_notes")}
                </p>
              </div>
              {hasNotes && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </Link>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
