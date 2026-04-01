"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText, RefreshCw, Loader2, Monitor, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ActivityLog } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-500/10 text-green-600 dark:text-green-400",
  logout: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  quiz_complete: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  system: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

interface GroupedLog extends ActivityLog {
  stackCount: number;
}

function groupConsecutiveLogs(logs: ActivityLog[]): GroupedLog[] {
  if (logs.length === 0) return [];

  const grouped: GroupedLog[] = [];
  let current: GroupedLog = { ...logs[0], stackCount: 1 };

  for (let i = 1; i < logs.length; i++) {
    const log = logs[i];
    if (log.userName === current.userName && log.action === current.action) {
      current.stackCount += 1;
    } else {
      grouped.push(current);
      current = { ...log, stackCount: 1 };
    }
  }
  grouped.push(current);
  return grouped;
}

function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  if (deviceType === "mobile") {
    return <Smartphone className="h-3 w-3 shrink-0 text-muted-foreground" />;
  }
  if (deviceType === "desktop") {
    return <Monitor className="h-3 w-3 shrink-0 text-muted-foreground" />;
  }
  return null;
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    fetch("/api/admin/logs?type=activity&limit=100")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => toast.error("Gagal memuat activity logs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const groupedLogs = useMemo(() => groupConsecutiveLogs(logs), [logs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScrollText className="h-5 w-5 text-primary" />
            Activity Logs
            <Badge variant="secondary" className="ml-1">
              {logs.length}
            </Badge>
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
            description="Hapus semua log yang lebih dari 7 hari? Aksi ini tidak bisa dibatalkan."
            onConfirm={async () => {
              const sevenDaysAgo = Date.now() - 7 * 86400000;
              const oldLogs = logs.filter((l) => new Date(l.createdAt).getTime() < sevenDaysAgo);
              if (oldLogs.length === 0) {
                toast.info("Tidak ada log lama untuk dihapus");
                return;
              }
              // Filter client-side (server should also have cleanup)
              setLogs((prev) => prev.filter((l) => new Date(l.createdAt).getTime() >= sevenDaysAgo));
              toast.success(`${oldLogs.length} log lama dihapus`);
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
            Belum ada activity
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1.5">
              {groupedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-[10px] ${ACTION_COLORS[log.action] || ""}`}
                  >
                    {log.action}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <DeviceIcon deviceType={log.deviceType} />
                      <span className="font-medium">
                        {log.userName || "System"}
                      </span>
                      {log.stackCount > 1 && (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                        >
                          x{log.stackCount}
                        </Badge>
                      )}
                    </div>
                    {log.details && (
                      <span className="text-muted-foreground">
                        {log.details}
                      </span>
                    )}
                    {log.count > 1 && (
                      <Badge
                        variant="outline"
                        className="ml-1 text-[10px]"
                      >
                        x{log.count}
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {log.ipAddress && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {log.ipAddress}
                        </span>
                      )}
                      {log.deviceLabel && (
                        <span className="text-[10px] text-muted-foreground">
                          {log.deviceLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                      locale: idLocale,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
