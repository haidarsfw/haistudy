"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Save, Loader2, Cloud, CloudOff, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { NoteMarkdown } from "@/components/shared/note-markdown";

interface PersonalNotesTabProps {
  subjectId: string;
  licenseKey: string;
}

// Notes are isolated per account + scope + subject.
const notesKey = (licenseKey: string, scopeKey: string, subjectId: string) =>
  `hs-notes::${licenseKey}::${scopeKey}::${subjectId}`;

export function PersonalNotesTab({
  subjectId,
  licenseKey,
}: PersonalNotesTabProps) {
  const { isPreview } = usePreviewGuard();
  const scopeCtx = useOptionalScope();
  const scopeKey = scopeCtx?.scopeKey ?? "";
  const [showPreview, setShowPreview] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialLoadDone = useRef(false);

  // Load notes - try server first, then localStorage fallback
  useEffect(() => {
    if (initialLoadDone.current) return;
    if (!scopeKey) return;
    initialLoadDone.current = true;

    const localKey = notesKey(licenseKey, scopeKey, subjectId);
    const localContent = localStorage.getItem(localKey) || "";

    // Start with local content immediately for fast paint
    if (localContent) setContent(localContent);

    // Fetch from server and merge (notes are nested by scope-key on the server)
    (async () => {
      try {
        const res = await fetch(`/api/settings`);
        const data = await res.json();
        const serverNotes =
          (data.settings?.notes as Record<string, Record<string, string>>) || {};
        const scopeNotes = serverNotes[scopeKey] || {};
        const serverContent = scopeNotes[subjectId] || "";

        if (serverContent && serverContent.length >= localContent.length) {
          // Server version is same or longer - use it
          setContent(serverContent);
          localStorage.setItem(localKey, serverContent);
          setSynced(true);
        } else if (localContent && !serverContent) {
          // Local exists but server doesn't - push local to server
          syncToServer(localContent, scopeNotes);
          setSynced(true);
        } else {
          setSynced(true);
        }
      } catch {
        // Offline - use local
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, licenseKey, scopeKey]);

  const syncToServer = useCallback(
    async (text: string, existingScopeNotes?: Record<string, string>) => {
      if (!scopeKey) return;
      try {
        // Current scope's notes map, so we don't overwrite other subjects.
        let scopeNotes = existingScopeNotes;
        if (!scopeNotes) {
          const res = await fetch(`/api/settings`);
          const data = await res.json();
          const allNotes =
            (data.settings?.notes as Record<string, Record<string, string>>) || {};
          scopeNotes = allNotes[scopeKey] || {};
        }

        const updatedNotes = { ...scopeNotes, [subjectId]: text };

        // Server merges this under notes[scopeKey], leaving other scopes intact.
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scopeKey,
            settings: { notes: updatedNotes },
          }),
        });
        setSynced(true);
      } catch {
        setSynced(false);
      }
    },
    [licenseKey, subjectId, scopeKey]
  );

  // Auto-save with debounce
  const save = useCallback(
    (text: string) => {
      if (!scopeKey) return;
      const key = notesKey(licenseKey, scopeKey, subjectId);
      localStorage.setItem(key, text);
      setLastSaved(new Date());

      // Debounced server sync
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        syncToServer(text);
      }, 2000); // 2s debounce for server sync
    },
    [subjectId, licenseKey, scopeKey, syncToServer]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isPreview) return;
      const text = e.target.value;
      setContent(text);
      setSynced(false);
      save(text);
    },
    [save, isPreview]
  );

  const handleManualSave = useCallback(() => {
    if (!scopeKey) return;
    setSaving(true);
    const key = notesKey(licenseKey, scopeKey, subjectId);
    localStorage.setItem(key, content);
    setLastSaved(new Date());
    syncToServer(content).finally(() => setSaving(false));
  }, [content, licenseKey, subjectId, scopeKey, syncToServer]);

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Catatan pribadi kamu. Mendukung Markdown &amp; LaTeX ($x^2$). Tersimpan otomatis.
          </p>
          {synced ? (
            <Cloud className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Tulis | Pratinjau toggle — renders bold/italic/lists/LaTeX. */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={saving || isPreview}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">Simpan</span>
          </Button>
        </div>
      </div>

      {showPreview ? (
        <div className="min-h-[300px] rounded-md border border-input bg-background px-3.5 py-3">
          <NoteMarkdown content={content} />
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={handleChange}
          disabled={isPreview}
          placeholder={isPreview ? "Beli akses untuk menulis catatan" : "Tulis catatan di sini... Markdown & LaTeX didukung ($x^2$)"}
          className="min-h-[300px] resize-y font-mono text-sm"
        />
      )}

      {lastSaved && (
        <p className="text-[10px] text-muted-foreground text-right">
          Terakhir disimpan: {lastSaved.toLocaleTimeString("id-ID")}
          {synced && " • Tersinkron"}
        </p>
      )}
    </div>
  );
}
