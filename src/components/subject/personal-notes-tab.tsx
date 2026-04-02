"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Save, Loader2, Cloud, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePreviewGuard } from "@/hooks/use-preview-guard";

interface PersonalNotesTabProps {
  subjectId: string;
  licenseKey: string;
}

const STORAGE_PREFIX = "hs-notes-";

export function PersonalNotesTab({
  subjectId,
  licenseKey,
}: PersonalNotesTabProps) {
  const { isPreview } = usePreviewGuard();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialLoadDone = useRef(false);

  // Load notes — try server first, then localStorage fallback
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const localKey = `${STORAGE_PREFIX}${licenseKey}-${subjectId}`;
    const localContent = localStorage.getItem(localKey) || "";

    // Start with local content immediately for fast paint
    if (localContent) setContent(localContent);

    // Fetch from server and merge
    (async () => {
      try {
        const res = await fetch(
          `/api/settings?licenseKey=${encodeURIComponent(licenseKey)}`
        );
        const data = await res.json();
        const serverNotes = (data.settings?.notes as Record<string, string>) || {};
        const serverContent = serverNotes[subjectId] || "";

        if (serverContent && serverContent.length >= localContent.length) {
          // Server version is same or longer — use it
          setContent(serverContent);
          localStorage.setItem(localKey, serverContent);
          setSynced(true);
        } else if (localContent && !serverContent) {
          // Local exists but server doesn't — push local to server
          syncToServer(localContent, data.settings?.notes || {});
          setSynced(true);
        } else {
          setSynced(true);
        }
      } catch {
        // Offline — use local
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, licenseKey]);

  const syncToServer = useCallback(
    async (text: string, existingNotes?: Record<string, string>) => {
      try {
        // Fetch current notes from server to avoid overwriting other subjects
        let allNotes = existingNotes;
        if (!allNotes) {
          const res = await fetch(
            `/api/settings?licenseKey=${encodeURIComponent(licenseKey)}`
          );
          const data = await res.json();
          allNotes = (data.settings?.notes as Record<string, string>) || {};
        }

        const updatedNotes = { ...allNotes, [subjectId]: text };

        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey,
            settings: { notes: updatedNotes },
          }),
        });
        setSynced(true);
      } catch {
        setSynced(false);
      }
    },
    [licenseKey, subjectId]
  );

  // Auto-save with debounce
  const save = useCallback(
    (text: string) => {
      const key = `${STORAGE_PREFIX}${licenseKey}-${subjectId}`;
      localStorage.setItem(key, text);
      setLastSaved(new Date());

      // Debounced server sync
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        syncToServer(text);
      }, 2000); // 2s debounce for server sync
    },
    [subjectId, licenseKey, syncToServer]
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
    setSaving(true);
    const key = `${STORAGE_PREFIX}${licenseKey}-${subjectId}`;
    localStorage.setItem(key, content);
    setLastSaved(new Date());
    syncToServer(content).finally(() => setSaving(false));
  }, [content, licenseKey, subjectId, syncToServer]);

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Catatan pribadi kamu untuk mata kuliah ini. Tersimpan otomatis.
          </p>
          {synced ? (
            <Cloud className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
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

      <Textarea
        value={content}
        onChange={handleChange}
        disabled={isPreview}
        placeholder={isPreview ? "Beli akses untuk menulis catatan" : "Tulis catatan di sini... (Markdown didukung)"}
        className="min-h-[300px] resize-y font-mono text-sm"
      />

      {lastSaved && (
        <p className="text-[10px] text-muted-foreground text-right">
          Terakhir disimpan: {lastSaved.toLocaleTimeString("id-ID")}
          {synced && " • Tersinkron"}
        </p>
      )}
    </div>
  );
}
