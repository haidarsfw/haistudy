"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Save, Loader2 } from "lucide-react";
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load notes from localStorage
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${licenseKey}-${subjectId}`;
    const saved = localStorage.getItem(key);
    if (saved) setContent(saved);
  }, [subjectId, licenseKey]);

  // Auto-save with debounce
  const save = useCallback(
    (text: string) => {
      const key = `${STORAGE_PREFIX}${licenseKey}-${subjectId}`;
      localStorage.setItem(key, text);
      setLastSaved(new Date());

      // TODO: Sync to Supabase when configured
    },
    [subjectId, licenseKey]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isPreview) return;
      const text = e.target.value;
      setContent(text);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => save(text), 500);
    },
    [save, isPreview]
  );

  const handleManualSave = useCallback(() => {
    setSaving(true);
    save(content);
    setTimeout(() => setSaving(false), 300);
  }, [content, save]);

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Catatan pribadi kamu untuk mata kuliah ini. Tersimpan otomatis.
        </p>
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
        </p>
      )}
    </div>
  );
}
