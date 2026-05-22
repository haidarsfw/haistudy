"use client";

import { useState } from "react";
import { Mail, Pencil, Check, X, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface OauthLinkCellProps {
  licenseKey: string;
  currentEmail: string | null;
  onChange?: (email: string | null) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OauthLinkCell({
  licenseKey,
  currentEmail,
  onChange,
}: OauthLinkCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentEmail || "");
  const [saving, setSaving] = useState(false);

  const save = async (value: string | null) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: licenseKey, linkedEmail: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal update email");
        return;
      }
      toast.success(value ? "Email tertaut." : "Email dilepas.");
      onChange?.(value);
      setEditing(false);
    } catch {
      toast.error("Koneksi gagal");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">
          {currentEmail || <span className="italic">—</span>}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit linked email"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {currentEmail && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={saving}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Unlink email"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Unlink className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    );
  }

  const valid = draft.trim() === "" || EMAIL_REGEX.test(draft.trim());

  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="user@gmail.com"
        autoFocus
        className="h-8 text-xs"
      />
      <button
        type="button"
        onClick={() => save(draft.trim() ? draft.trim() : null)}
        disabled={saving || !valid}
        className="text-primary disabled:opacity-50"
        aria-label="Save email"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          setDraft(currentEmail || "");
          setEditing(false);
        }}
        disabled={saving}
        className="text-muted-foreground"
        aria-label="Cancel edit"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
