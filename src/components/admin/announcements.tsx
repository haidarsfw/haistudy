"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-500", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", label: "Warning" },
  maintenance: { icon: Wrench, color: "text-orange-500", label: "Maintenance" },
} as const;

export function AdminAnnouncements() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<"info" | "warning" | "maintenance">(
    "info"
  );
  const [creating, setCreating] = useState(false);
  const [notifyOnly, setNotifyOnly] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch {
      toast.error("Gagal memuat announcements");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = useCallback(async () => {
    if (!newMessage.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/admin/announcements", {
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
      toast.success(notifyOnly ? "Notifikasi terkirim ke semua user" : "Announcement dibuat");
    } catch {
      toast.error(notifyOnly ? "Gagal mengirim notifikasi" : "Gagal membuat announcement");
    }
    setCreating(false);
  }, [newMessage, newType, notifyOnly]);

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    try {
      await fetch("/api/admin/announcements", {
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
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement dihapus");
    } catch {
      toast.error("Gagal menghapus");
    }
  }, []);

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
                  // Delete all announcements
                  await Promise.all(
                    announcements.map((a) =>
                      fetch("/api/admin/announcements", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: a.id }),
                      })
                    )
                  );
                  // Also clear announcement notifications for all users
                  await fetch("/api/notifications", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "clearAnnouncements" }),
                  }).catch(() => {}); // non-critical
                  setAnnouncements([]);
                  toast.success("Semua announcement dan notifikasi user dihapus");
                } catch {
                  toast.error("Gagal menghapus announcement");
                }
              }}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={newType}
              onValueChange={(v) =>
                v && setNewType(v as "info" | "warning" | "maintenance")
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Tulis announcement..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={creating || !newMessage.trim()}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : notifyOnly ? (
                <Bell className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
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
                    <p className="text-sm">{ann.message}</p>
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
