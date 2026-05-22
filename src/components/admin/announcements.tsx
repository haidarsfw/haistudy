"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Info,
  AlertTriangle,
  Wrench,
  Bell,
} from "lucide-react";

import type { Announcement } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { scopeCompact } from "@/components/admin/scope-dropdown-content";
import { Lock } from "lucide-react";

type ScopedAnnouncement = Announcement & {
  semester?: number;
  examPeriod?: "uts" | "uas";
  jurusan?: string;
};

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-500", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", label: "Warning" },
  maintenance: { icon: Wrench, color: "text-orange-500", label: "Maintenance" },
} as const;

export function AdminAnnouncements() {
  const { t } = useTranslation();
  const { adminScope, adminScopeKey, isAllPeriods, scopeQuery, hydrated } = useAdminScope();
  const [announcements, setAnnouncements] = useState<ScopedAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<"info" | "warning" | "maintenance">(
    "info"
  );
  const [creating, setCreating] = useState(false);
  const [notifyOnly, setNotifyOnly] = useState(false);

  const lockedAllPeriods = hydrated && (isAllPeriods || adminScope === "all");

  const fetchAnnouncements = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements${scopeQuery()}`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch {
      toast.error("Gagal memuat announcements");
    }
    setLoading(false);
  }, [hydrated, scopeQuery]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements, adminScopeKey]);

  const handleCreate = useCallback(async () => {
    if (!newMessage.trim()) return;
    if (lockedAllPeriods) {
      toast.error("Pilih scope spesifik dulu untuk create announcement.");
      return;
    }
    setCreating(true);

    try {
      const res = await fetch(`/api/admin/announcements${scopeQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim(), type: newType, notifyOnly }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!notifyOnly && data.announcement) {
        setAnnouncements((prev) => [data.announcement, ...prev]);
      }
      setNewMessage("");
      toast.success(notifyOnly ? "Notifikasi terkirim ke users di scope ini" : "Announcement dibuat");
    } catch {
      toast.error(notifyOnly ? "Gagal mengirim notifikasi" : "Gagal membuat announcement");
    }
    setCreating(false);
  }, [newMessage, newType, notifyOnly, lockedAllPeriods, scopeQuery]);

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    try {
      await fetch(`/api/admin/announcements${scopeQuery()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, active: !active } : a))
      );
    } catch {
      toast.error("Gagal mengupdate");
    }
  }, [scopeQuery]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/admin/announcements${scopeQuery()}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement dihapus");
    } catch {
      toast.error("Gagal menghapus");
    }
  }, [scopeQuery]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" />
            Announcements
            <Badge variant="secondary" className="ml-1">{announcements.length}</Badge>
          </CardTitle>
          {announcements.length > 0 && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1">
                  <Trash2 className="h-3 w-3" />
                  Hapus Semua
                </Button>
              }
              description={`Hapus semua ${announcements.length} announcement dan bersihkan dari notifikasi semua user? Aksi ini tidak bisa dibatalkan.`}
              onConfirm={async () => {
                try {
                  // Delete all announcements (scoped to current adminScope)
                  await Promise.all(
                    announcements.map((a) =>
                      fetch(`/api/admin/announcements${scopeQuery()}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: a.id }),
                      })
                    )
                  );
                  // Also clear announcement notifications for users in same scope
                  await fetch(`/api/notifications${scopeQuery()}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "clearAnnouncements" }),
                  }).catch(() => {}); // non-critical
                  setAnnouncements([]);
                  toast.success("Semua announcement & notifikasi user dihapus");
                } catch {
                  toast.error("Gagal menghapus announcement");
                }
              }}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lockedAllPeriods && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Mode &quot;All periods&quot; aktif
              </p>
              <p className="text-amber-700/80 dark:text-amber-400/80">
                Announcement creation terbind ke 1 scope. Switch scope di admin header dulu.
              </p>
            </div>
          </div>
        )}
        {!lockedAllPeriods && adminScope !== "all" && hydrated && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-1.5 text-xs">
            Target scope: <span className="font-semibold">{scopeCompact(adminScope)}</span>
          </div>
        )}
        {/* Create new */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={newType}
              onValueChange={(v) =>
                v && setNewType(v as "info" | "warning" | "maintenance")
              }
            >
              <SelectTrigger className="w-32 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Tulis announcement... (Gunakan Enter untuk baris baru)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 resize-none min-h-20"
              />
              <Button onClick={handleCreate} disabled={creating || !newMessage.trim() || lockedAllPeriods} className="self-end">
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : notifyOnly ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notifyOnly}
              onChange={(e) => setNotifyOnly(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <Bell className="h-3 w-3" />
            Notifikasi saja (tidak tampil di banner)
          </label>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada announcement
          </p>
        ) : (
          <div className="space-y-2">
            {announcements.map((ann) => {
              const config = TYPE_CONFIG[ann.type];
              const Icon = config.icon;

              return (
                <div
                  key={ann.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    !ann.active ? "opacity-50" : ""
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm whitespace-pre-line break-words">{ann.message}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {config.label}
                      </Badge>
                      <span>
                        {formatDistanceToNow(new Date(ann.createdAt), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                      </span>
                      {isAllPeriods && ann.semester !== undefined && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          s{ann.semester}-{ann.examPeriod}-{ann.jurusan}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleToggle(ann.id, ann.active)}
                      title={ann.active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {ann.active ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                      description={t("confirm.delete_announcement")}
                      onConfirm={() => handleDelete(ann.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
