"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ErrorLog } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export function ErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    fetch("/api/admin/logs?type=error&limit=100")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => toast.error("Gagal memuat error logs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResolve = useCallback(async (id: string) => {
    try {
      await fetch("/api/admin/logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved: true }),
      });
      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, resolved: true } : l))
      );
      toast.success("Error marked as resolved");
    } catch {
      toast.error("Gagal mengupdate");
    }
  }, []);

  const unresolvedCount = logs.filter((l) => !l.resolved).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Error Logs
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unresolvedCount}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={fetchLogs}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
            description="Hapus semua error log yang lebih dari 7 hari?"
            onConfirm={async () => {
              const sevenDaysAgo = Date.now() - 7 * 86400000;
              const oldLogs = logs.filter((l) => new Date(l.createdAt).getTime() < sevenDaysAgo);
              if (oldLogs.length === 0) {
                toast.info("Tidak ada log lama untuk dihapus");
                return;
              }
              setLogs((prev) => prev.filter((l) => new Date(l.createdAt).getTime() >= sevenDaysAgo));
              toast.success(`${oldLogs.length} error log lama dihapus`);
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada error
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 text-sm ${
                    log.resolved
                      ? "border-border/50 opacity-60"
                      : "border-destructive/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === log.id ? null : log.id
                          )
                        }
                        className="text-left font-medium hover:underline"
                      >
                        {log.message}
                      </button>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </span>
                        {log.resolved && (
                          <Badge
                            variant="secondary"
                            className="gap-0.5 text-[10px]"
                          >
                            <CheckCircle className="h-2.5 w-2.5" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!log.resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleResolve(log.id)}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Resolve
                      </Button>
                    )}
                  </div>

                  {expandedId === log.id && (
                    <div className="mt-2 space-y-1">
                      {log.stack && (
                        <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                          {log.stack}
                        </pre>
                      )}
                      {log.context && (
                        <pre className="max-h-20 overflow-auto rounded bg-muted p-2 text-xs">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      )}
                      {log.userAgent && (
                        <p className="text-xs text-muted-foreground">
                          UA: {log.userAgent}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
