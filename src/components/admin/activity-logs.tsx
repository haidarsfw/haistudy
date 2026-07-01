"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ScrollText,
  RefreshCw,
  Loader2,
  Monitor,
  Smartphone,
  Trash2,
  LogIn,
  LogOut,
  ShoppingCart,
  Download,
  Lock,
  LockOpen,
  KeyRound,
  UserX,
  GraduationCap,
  Server,
  Activity,
  Search,
  X,
  Clock,
  Globe,
  List,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ActivityLog } from "@/types";
import type { LucideIcon } from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAdminScope } from "@/components/providers/admin-scope-provider";

type ScopedActivityLog = ActivityLog & {
  semester?: number;
  examPeriod?: "uts" | "uas";
  jurusan?: string;
};

// action → colour + icon + human label. Unknown actions fall back gracefully.
interface ActionMeta {
  chip: string;
  bar: string;
  Icon: LucideIcon;
  label: string;
}
const ACTION_META: Record<string, ActionMeta> = {
  login: { chip: "bg-green-500/10 text-green-600 dark:text-green-400", bar: "border-l-green-500/70", Icon: LogIn, label: "Login" },
  logout: { chip: "bg-slate-500/10 text-slate-600 dark:text-slate-400", bar: "border-l-slate-500/70", Icon: LogOut, label: "Logout" },
  purchase_request: { chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400", bar: "border-l-blue-500/70", Icon: ShoppingCart, label: "Pembelian" },
  cheatsheet_download: { chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", bar: "border-l-amber-500/70", Icon: Download, label: "Download CS" },
  cheatsheet_unlock: { chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", bar: "border-l-emerald-500/70", Icon: LockOpen, label: "Buka CS" },
  cheatsheet_lock: { chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400", bar: "border-l-rose-500/70", Icon: Lock, label: "Kunci CS" },
  exam_regrade: { chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", bar: "border-l-indigo-500/70", Icon: RefreshCw, label: "Nilai Ulang" },
  license_update: { chip: "bg-purple-500/10 text-purple-600 dark:text-purple-400", bar: "border-l-purple-500/70", Icon: KeyRound, label: "Edit Lisensi" },
  license_delete: { chip: "bg-red-500/10 text-red-600 dark:text-red-400", bar: "border-l-red-500/70", Icon: UserX, label: "Hapus Lisensi" },
  quiz_complete: { chip: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", bar: "border-l-cyan-500/70", Icon: GraduationCap, label: "Quiz" },
  system: { chip: "bg-purple-500/10 text-purple-600 dark:text-purple-400", bar: "border-l-purple-500/70", Icon: Server, label: "Sistem" },
};
function metaFor(action: string): ActionMeta {
  return (
    ACTION_META[action] ?? {
      chip: "bg-muted text-muted-foreground",
      bar: "border-l-border",
      Icon: Activity,
      label: action,
    }
  );
}
// Actions offered in the filter dropdown (see-all dialog).
const FILTERABLE_ACTIONS = Object.keys(ACTION_META);

interface GroupedLog extends ScopedActivityLog {
  stackCount: number;
}

// Collapse consecutive identical (same user + action) rows into one x-N row.
function groupConsecutiveLogs(logs: ScopedActivityLog[]): GroupedLog[] {
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

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Hari ini";
  if (isYesterday(d)) return "Kemarin";
  return format(d, "d MMM yyyy", { locale: idLocale });
}

// Split an ordered (newest-first) log list into day sections, grouping
// consecutive duplicates within each day.
function toDaySections(
  logs: ScopedActivityLog[]
): { label: string; logs: GroupedLog[] }[] {
  const sections: { label: string; logs: GroupedLog[] }[] = [];
  let currentLabel = "";
  let bucket: ScopedActivityLog[] = [];
  const flush = () => {
    if (bucket.length) sections.push({ label: currentLabel, logs: groupConsecutiveLogs(bucket) });
    bucket = [];
  };
  for (const log of logs) {
    const label = dayLabel(log.createdAt);
    if (label !== currentLabel) {
      flush();
      currentLabel = label;
    }
    bucket.push(log);
  }
  flush();
  return sections;
}

function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  if (deviceType === "mobile") return <Smartphone className="h-3 w-3 shrink-0 text-muted-foreground" />;
  if (deviceType === "desktop") return <Monitor className="h-3 w-3 shrink-0 text-muted-foreground" />;
  return null;
}

// ─── One log row (used in the card, the see-all dialog, and the mini list) ───
function LogRow({
  log,
  showScope,
  onClick,
}: {
  log: GroupedLog;
  showScope: boolean;
  onClick?: () => void;
}) {
  const meta = metaFor(log.action);
  const Icon = meta.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 border-l-2 ${meta.bar} rounded-r-md px-2.5 py-2 text-left transition-colors hover:bg-muted/60`}
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.chip}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="truncate font-medium">{log.userName || "System"}</span>
          <Badge variant="secondary" className={`text-[10px] ${meta.chip}`}>
            {meta.label}
          </Badge>
          {log.stackCount > 1 && (
            <Badge variant="outline" className="text-[10px]">x{log.stackCount}</Badge>
          )}
          {showScope && log.semester !== undefined && (
            <Badge variant="outline" className="font-mono text-[10px]">
              s{log.semester}-{log.examPeriod}-{log.jurusan}
            </Badge>
          )}
        </div>
        {log.details && (
          <p className="truncate text-xs text-muted-foreground">{log.details}</p>
        )}
        {(log.ipAddress || log.deviceLabel) && (
          <div className="mt-0.5 flex items-center gap-2">
            <DeviceIcon deviceType={log.deviceType} />
            {log.ipAddress && (
              <span className="font-mono text-[10px] text-muted-foreground">{log.ipAddress}</span>
            )}
            {log.deviceLabel && (
              <span className="text-[10px] text-muted-foreground">{log.deviceLabel}</span>
            )}
          </div>
        )}
      </div>
      <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: idLocale })}
      </span>
    </button>
  );
}

// ─── Day-grouped list ───
function LogSections({
  logs,
  showScope,
  onSelect,
}: {
  logs: ScopedActivityLog[];
  showScope: boolean;
  onSelect: (log: ScopedActivityLog) => void;
}) {
  const sections = useMemo(() => toDaySections(logs), [logs]);
  return (
    <div className="space-y-3">
      {sections.map((sec) => (
        <div key={sec.label}>
          <p className="sticky top-0 z-10 mb-1 bg-background/95 px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            {sec.label}
          </p>
          <div className="space-y-0.5">
            {sec.logs.map((log) => (
              <LogRow key={log.id} log={log} showScope={showScope} onClick={() => onSelect(log)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityLogs() {
  const { adminScopeKey, isAllPeriods, scopeQuery, hydrated } = useAdminScope();
  const [logs, setLogs] = useState<ScopedActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScopedActivityLog | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Merge the scope querystring with extra params.
  const buildUrl = useCallback(
    (params: Record<string, string>) => {
      const scoped = scopeQuery(); // "" | "?scope=..." | "?allPeriods=1"
      const usp = new URLSearchParams(params);
      return `/api/admin/logs${scoped ? scoped + "&" : "?"}${usp.toString()}`;
    },
    [scopeQuery]
  );

  const fetchLogs = useCallback(() => {
    if (!hydrated) return;
    fetch(buildUrl({ type: "activity", limit: "50" }))
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => toast.error("Gagal memuat activity logs"))
      .finally(() => setLoading(false));
  }, [hydrated, buildUrl]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs, adminScopeKey]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="h-5 w-5 text-primary" />
              Activity Logs
              <Badge variant="secondary" className="ml-1">{logs.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setLoading(true); fetchLogs(); }} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                }
                description="Hapus permanen semua log yang lebih dari 30 hari? Aksi ini tidak bisa dibatalkan."
                onConfirm={async () => {
                  try {
                    const res = await fetch("/api/admin/logs", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ type: "activity", olderThanDays: 30 }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error();
                    toast.success(`${data.deleted ?? 0} log lama dihapus`);
                    setLoading(true);
                    fetchLogs();
                  } catch {
                    toast.error("Gagal menghapus log");
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada activity</p>
          ) : (
            <>
              <div className="max-h-[420px] overflow-y-auto overscroll-contain pr-1">
                <LogSections logs={logs} showScope={isAllPeriods} onSelect={setSelected} />
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowAll(true)}>
                <List className="mr-1.5 h-3.5 w-3.5" />
                Lihat semua log
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {showAll && (
        <AllLogsDialog
          open={showAll}
          onClose={() => setShowAll(false)}
          buildUrl={buildUrl}
          showScope={isAllPeriods}
          onSelect={setSelected}
        />
      )}

      <LogDetailDialog
        log={selected}
        onClose={() => setSelected(null)}
        buildUrl={buildUrl}
        showScope={isAllPeriods}
      />
    </>
  );
}

// ─── "Lihat semua" — search + action filter + cursor pagination ───
function AllLogsDialog({
  open,
  onClose,
  buildUrl,
  showScope,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  buildUrl: (p: Record<string, string>) => string;
  showScope: boolean;
  onSelect: (log: ScopedActivityLog) => void;
}) {
  const PAGE = 100;
  const [logs, setLogs] = useState<ScopedActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [action, setAction] = useState("");

  // debounce the search box
  const searchRef = useRef(search);
  searchRef.current = search;
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchRef.current.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { type: "activity", limit: String(PAGE) };
    if (debounced) params.q = debounced;
    if (action) params.action = action;
    fetch(buildUrl(params))
      .then((r) => r.json())
      .then((data) => {
        const rows: ScopedActivityLog[] = data.logs || [];
        setLogs(rows);
        setHasMore(rows.length === PAGE);
      })
      .catch(() => toast.error("Gagal memuat log"))
      .finally(() => setLoading(false));
  }, [buildUrl, debounced, action]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = () => {
    if (logs.length === 0) return;
    setLoadingMore(true);
    const params: Record<string, string> = {
      type: "activity",
      limit: String(PAGE),
      before: logs[logs.length - 1].createdAt,
    };
    if (debounced) params.q = debounced;
    if (action) params.action = action;
    fetch(buildUrl(params))
      .then((r) => r.json())
      .then((data) => {
        const rows: ScopedActivityLog[] = data.logs || [];
        setLogs((prev) => [...prev, ...rows]);
        setHasMore(rows.length === PAGE);
      })
      .catch(() => toast.error("Gagal memuat log"))
      .finally(() => setLoadingMore(false));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton
        className="flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 gap-2 border-b border-border px-4 py-3 sm:px-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-primary" />
            Semua Activity Logs
          </DialogTitle>
          <DialogDescription className="sr-only">Cari dan telusuri semua log aktivitas.</DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama..."
                className="h-9 pl-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Semua aksi</option>
              {FILTERABLE_ACTIONS.map((a) => (
                <option key={a} value={a}>{metaFor(a).label}</option>
              ))}
            </select>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada log yang cocok</p>
          ) : (
            <>
              <LogSections logs={logs} showScope={showScope} onSelect={onSelect} />
              {hasMore && (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Muat lebih banyak
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail dialog: full record + recent activity by the same user ───
function LogDetailDialog({
  log,
  onClose,
  buildUrl,
  showScope,
}: {
  log: ScopedActivityLog | null;
  onClose: () => void;
  buildUrl: (p: Record<string, string>) => string;
  showScope: boolean;
}) {
  const [userLogs, setUserLogs] = useState<ScopedActivityLog[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (!log || !log.userName) {
      setUserLogs([]);
      return;
    }
    setLoadingUser(true);
    fetch(buildUrl({ type: "activity", user: log.userName, limit: "15" }))
      .then((r) => r.json())
      .then((data) => setUserLogs((data.logs || []).filter((l: ScopedActivityLog) => l.id !== log.id)))
      .catch(() => setUserLogs([]))
      .finally(() => setLoadingUser(false));
  }, [log, buildUrl]);

  const meta = log ? metaFor(log.action) : null;
  const Icon = meta?.Icon ?? Activity;

  return (
    <Dialog open={log != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton
        className="flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {log && meta && (
          <>
            <DialogHeader className="shrink-0 gap-0 border-b border-border px-4 py-3 sm:px-5">
              <DialogTitle className="flex items-center gap-2 text-base">
                <span className={`flex h-7 w-7 items-center justify-center rounded-md ${meta.chip}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {log.userName || "System"}
              </DialogTitle>
              <DialogDescription className="sr-only">Detail log aktivitas.</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={`text-xs ${meta.chip}`}>{meta.label}</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{log.action}</span>
                {log.count > 1 && <Badge variant="outline" className="text-[10px]">x{log.count}</Badge>}
              </div>

              {log.details && <p className="mt-2 text-sm text-foreground/90">{log.details}</p>}

              <dl className="mt-4 grid grid-cols-1 gap-y-2.5 text-sm sm:grid-cols-2">
                <Field icon={Clock} label="Waktu">
                  {format(new Date(log.createdAt), "d MMM yyyy, HH:mm", { locale: idLocale })}
                </Field>
                <Field icon={Globe} label="IP Address">
                  <span className="font-mono">{log.ipAddress || "-"}</span>
                </Field>
                <Field icon={log.deviceType === "mobile" ? Smartphone : Monitor} label="Perangkat">
                  {[log.deviceLabel, log.deviceType].filter(Boolean).join(" · ") || "-"}
                </Field>
                {showScope && log.semester !== undefined && (
                  <Field icon={ScrollText} label="Scope">
                    <span className="font-mono">s{log.semester}-{log.examPeriod}-{log.jurusan}</span>
                  </Field>
                )}
              </dl>

              <div className="mt-5">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Aktivitas terbaru {log.userName || ""}
                </p>
                {loadingUser ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : userLogs.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">Tidak ada aktivitas lain</p>
                ) : (
                  <div className="space-y-0.5">
                    {groupConsecutiveLogs(userLogs).map((l) => (
                      <LogRow key={l.id} log={l} showScope={false} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-foreground/90">{children}</dd>
    </div>
  );
}
