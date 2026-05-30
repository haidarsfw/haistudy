"use client";

import { useState, useEffect } from "react";
import { MessageSquarePlus, CheckCircle2, Eye, Clock, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import { toast } from "@/components/ui/toast";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { Badge } from "@/components/ui/badge";

interface FeedbackItem {
  id: string;
  licenseKey: string;
  name: string;
  category: "bug" | "feature" | "other";
  message: string;
  imageUrls: string[];
  status: "unread" | "read" | "resolved";
  createdAt: string;
  semester?: number;
  examPeriod?: "uts" | "uas";
  jurusan?: string;
}

const categoryLabel: Record<string, string> = {
  bug: "Bug",
  feature: "Saran Fitur",
  other: "Lainnya",
};

const categoryColor: Record<string, string> = {
  bug: "bg-red-500/10 text-red-600 dark:text-red-400",
  feature: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  other: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

const statusIcon: Record<string, typeof Clock> = {
  unread: Clock,
  read: Eye,
  resolved: CheckCircle2,
};

export function FeedbackList() {
  const { adminScopeKey, isAllPeriods, scopeQuery, hydrated } = useAdminScope();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/feedback${scopeQuery()}`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [hydrated, scopeQuery, adminScopeKey]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/feedback${scopeQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStatus", feedbackId: id, status }),
      });
      setItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: status as FeedbackItem["status"] } : f))
      );
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Memuat feedback...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
        <MessageSquarePlus className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Belum ada feedback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          Feedback ({items.length})
        </h3>
        {items.length > 0 && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1">
                <Trash2 className="h-3 w-3" />
                Hapus Semua
              </Button>
            }
            description={`Hapus semua ${items.length} feedback? Aksi ini tidak bisa dibatalkan.`}
            onConfirm={async () => {
              try {
                await fetch(`/api/feedback${scopeQuery()}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "clearAll" }),
                });
                setItems([]);
                toast.success("Semua feedback dihapus");
              } catch {
                toast.error("Gagal menghapus feedback");
              }
            }}
          />
        )}
      </div>
      {items.map((item) => {
        const StatusIcon = statusIcon[item.status] || Clock;
        return (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className={`rounded-xl border bg-card p-4 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors ${
              item.status === "unread" ? "border-primary/30" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    categoryColor[item.category]
                  }`}
                >
                  {categoryLabel[item.category]}
                </span>
                <span className="text-sm font-medium truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground capitalize">
                  {item.status}
                </span>
                {isAllPeriods && item.semester !== undefined && (
                  <Badge variant="outline" className="text-[10px] font-mono ml-1">
                    s{item.semester}-{item.examPeriod}-{item.jurusan}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed line-clamp-3">{item.message}</p>
            {item.imageUrls?.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                <span>{item.imageUrls.length} gambar</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div className="flex gap-1.5">
                {item.status === "unread" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateStatus(item.id, "read")}
                  >
                    Tandai Dibaca
                  </Button>
                )}
                {item.status !== "resolved" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-green-600"
                    onClick={() => updateStatus(item.id, "resolved")}
                  >
                    Selesai
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Detail popup */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        {selectedItem && (
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    categoryColor[selectedItem.category]
                  }`}
                >
                  {categoryLabel[selectedItem.category]}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {selectedItem.status}
                </span>
              </div>
              <DialogTitle>{selectedItem.name}</DialogTitle>
              <DialogDescription>
                {new Date(selectedItem.createdAt).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedItem.message}
              </p>

              {selectedItem.imageUrls?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Lampiran</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.imageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Lampiran ${i + 1}`}
                        className="rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity object-cover aspect-video w-full"
                        onClick={() => setPreviewImage(url)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-border">
                {selectedItem.status === "unread" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      updateStatus(selectedItem.id, "read");
                      setSelectedItem({ ...selectedItem, status: "read" });
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Tandai Dibaca
                  </Button>
                )}
                {selectedItem.status !== "resolved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-green-600"
                    onClick={() => {
                      updateStatus(selectedItem.id, "resolved");
                      setSelectedItem({ ...selectedItem, status: "resolved" });
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Selesai
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <MediaPreviewer src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
