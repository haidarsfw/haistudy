"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useTranslation } from "@/components/providers/language-provider";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  KeyRound,
  Search,
  Plus,
  Pencil,
  Trash2,
  Shield,
  FlaskConical,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Mail,
  Phone,
  Clock,
  Trophy,
  Calendar,
  Globe,
  User,
  Copy,
  CheckCircle,
  MessageSquare,
  Bot,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toast";
import { LicenseForm } from "./license-form";
import { OauthLinkCell } from "./oauth-link-cell";
import type { LicenseKey, Activation, Device } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { scopeKey } from "@/lib/scope";

type ScopedLicense = LicenseKey & {
  semester?: number;
  examPeriod?: "uts" | "uas";
  jurusan?: string;
};

function formatOnlineTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** AI conversation type from admin API */
interface AdminAiConversation {
  id: string;
  license_key: string;
  title: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  created_at: string;
  updated_at: string;
}

/** AI Conversations Dialog */
function AiConversationsDialog({
  licenseKey,
  open,
  onOpenChange,
}: {
  licenseKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { scopeQuery } = useAdminScope();
  const [conversations, setConversations] = useState<AdminAiConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const q = scopeQuery();
    const sep = q ? "&" : "?";
    fetch(`/api/admin/ai-conversations${q}${sep}licenseKey=${encodeURIComponent(licenseKey)}`)
      .then((r) => r.json())
      .then((data) => setConversations(data.conversations || []))
      .catch(() => toast.error("Gagal memuat AI conversations"))
      .finally(() => setLoading(false));
  }, [open, licenseKey, scopeQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Conversations
          </DialogTitle>
          <DialogDescription>
            Riwayat chat AI untuk <code className="text-xs">{licenseKey}</code>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada AI conversations
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const msgCount = conv.messages?.length || 0;
              const isExpanded = expandedId === conv.id;
              return (
                <div key={conv.id} className="rounded-lg border">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                    className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.title || "(Untitled)"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {msgCount} messages · {format(new Date(conv.updated_at), "d MMM yyyy, HH:mm", { locale: idLocale })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {msgCount}
                    </Badge>
                  </button>

                  {isExpanded && conv.messages && conv.messages.length > 0 && (
                    <div className="border-t">
                      <ScrollArea className="max-h-[400px]">
                        <div className="p-3 space-y-2">
                          {conv.messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`rounded-lg p-2.5 text-sm ${
                                msg.role === "user"
                                  ? "bg-primary/10 ml-8"
                                  : "bg-muted/60 mr-8"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                {msg.role === "user" ? (
                                  <User className="h-3 w-3 text-primary" />
                                ) : (
                                  <Bot className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                  {msg.role === "user" ? "User" : "AI"}
                                </span>
                              </div>
                              <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                                {msg.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Full user detail dialog shown when admin clicks a license row */
function UserDetailDialog({
  license,
  activation,
  devices: devs,
  profileEmail,
  profilePhone,
  linkedEmail,
  onLinkedEmailChange,
  open,
  onOpenChange,
}: {
  license: LicenseKey;
  activation: Activation | undefined;
  devices: Device[];
  profileEmail: string | null;
  profilePhone: string | null;
  linkedEmail: string | null;
  onLinkedEmailChange: (email: string | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { scopeQuery } = useAdminScope();
  const [copied, setCopied] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [resettingDevices, setResettingDevices] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(license.key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleResetDevices = async () => {
    setResettingDevices(true);
    try {
      const res = await fetch(`/api/admin/licenses${scopeQuery()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: license.key, action: "reset-devices" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Devices berhasil direset (${data.deletedCount || 0} dihapus)`);
        onOpenChange(false);
      } else {
        toast.error(data.error || "Gagal reset devices");
      }
    } catch {
      toast.error("Gagal menghubungi server");
    } finally {
      setResettingDevices(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            User Detail
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap pengguna
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* License Key */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">License Key</span>
            <div className="flex items-center gap-2">
              <code className="text-sm font-bold text-foreground flex-1">{license.key}</code>
              <button onClick={copyKey} className="text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {license.isAdmin && <Badge variant="admin-outline" className="text-[10px] gap-0.5"><Shield className="h-2.5 w-2.5" /> Admin</Badge>}
              {license.isTester && <Badge variant="tester-outline" className="text-[10px] gap-0.5"><FlaskConical className="h-2.5 w-2.5" /> Tester</Badge>}
              {license.packageTier === "diamond" && <Badge variant="diamond-outline" className="text-[10px]">Diamond</Badge>}
              {(license.packageTier === "vip" || license.packageTier === "diamond") && <Badge variant="vip-outline" className="text-[10px]">VIP</Badge>}
              {license.packageTier === "normal" && <Badge variant="secondary" className="text-[10px]">Normal</Badge>}
              {license.packageTier === "share" && <Badge variant="outline" className="text-[10px]">Share</Badge>}
              {license.suspendedUntil && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
            </div>
          </div>

          <Separator />

          {/* User Info */}
          {activation ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoField icon={<User className="h-3.5 w-3.5" />} label="Username" value={activation.userName} />
                <InfoField icon={<KeyRound className="h-3.5 w-3.5" />} label="Nama" value={license.name} />
                <InfoField icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={profileEmail || activation.email || "-"} />
                <InfoField icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={profilePhone || "-"} />
                <InfoField icon={<Globe className="h-3.5 w-3.5" />} label="Referral Code" value={activation.referralCode || "-"} />
                <InfoField
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Aktivasi"
                  value={format(new Date(activation.activatedAt), "d MMM yyyy, HH:mm", { locale: idLocale })}
                />
                <InfoField
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Expiry"
                  value={activation.expiry ? format(new Date(activation.expiry), "d MMM yyyy", { locale: idLocale }) : "Lifetime"}
                />
              </div>

              {activation.referredBy && (
                <div className="text-xs text-muted-foreground">
                  Direferensikan oleh: <span className="font-medium">{activation.referredBy}</span> · Referral count: {activation.referralCount}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">Belum diaktivasi</p>
          )}

          <Separator />

          {/* Login methods */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Login methods</span>
            <div className="rounded-md border border-border bg-muted/20 p-2 text-xs">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">License key</span>
                <span className="ml-auto font-mono text-foreground">{license.key}</span>
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2">
              <OauthLinkCell
                licenseKey={license.key}
                currentEmail={linkedEmail}
                onChange={onLinkedEmailChange}
              />
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <Trophy className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{license.totalQuizScore}</p>
              <p className="text-[10px] text-muted-foreground">Total Quiz Score</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{formatOnlineTime(license.totalOnlineMinutes)}</p>
              <p className="text-[10px] text-muted-foreground">Total Online</p>
            </div>
          </div>

          {/* Devices */}
          {devs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Devices ({devs.length}/{license.maxDevices})</span>
                {devs.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-xs">
                    {d.deviceType === "mobile" ? <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> :
                     d.deviceType === "tablet" ? <Tablet className="h-3.5 w-3.5 text-muted-foreground" /> :
                     <Monitor className="h-3.5 w-3.5 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{d.deviceLabel || d.deviceType}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{d.deviceId.slice(0, 16)}...</p>
                    </div>
                    <div className="text-right shrink-0">
                      {d.isPrimary && <Badge variant="secondary" className="text-[8px]">Primary</Badge>}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true, locale: idLocale })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <Separator />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setAiDialogOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
              Lihat AI Conversations
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  disabled={resettingDevices}
                >
                  {resettingDevices ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Reset Devices
                </Button>
              }
              title="Reset Devices?"
              description={`Semua perangkat yang terhubung ke ${license.key} (${license.name}) akan dihapus. User perlu login ulang di perangkat mereka.`}
              onConfirm={handleResetDevices}
            />
          </div>
          {/* Meta */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Max devices: {license.unlimitedDevices ? "Unlimited" : license.maxDevices}</p>
            <p>Days active: {license.daysActive}</p>
            <p>Created: {format(new Date(license.createdAt), "d MMM yyyy, HH:mm", { locale: idLocale })}</p>
          </div>
        </div>

        {/* AI Conversations sub-dialog */}
        <AiConversationsDialog
          licenseKey={license.key}
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

export function LicenseTable() {
  const { adminScopeKey, isAllPeriods, scopeQuery, hydrated } = useAdminScope();
  const [licenses, setLicenses] = useState<ScopedLicense[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { email: string | null; phone: string | null }>>({});
  const [oauthLinks, setOauthLinks] = useState<Record<string, { email: string; linkedAt: string; provider: string }>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<LicenseKey | null>(null);
  const [selectedLicenseKey, setSelectedLicenseKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/licenses${scopeQuery()}`);
      const data = await res.json();
      setLicenses(
        ((data.licenses || []) as LicenseKey[]).map((l) => ({
          ...l,
          linkedEmail: data.oauthLinks?.[l.key]?.email ?? null,
        }))
      );
      setActivations(data.activations || []);
      setDevices(data.devices || []);
      setProfiles(data.profiles || {});
      setOauthLinks(data.oauthLinks || {});
    } catch {
      toast.error("Gagal memuat data lisensi");
    }
    setLoading(false);
  }, [hydrated, scopeQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData, adminScopeKey]);

  const { t } = useTranslation();

  const handleDelete = useCallback(
    async (key: string) => {
      if (isAllPeriods) {
        toast.error("Pilih scope spesifik dulu untuk delete license.");
        return;
      }
      try {
        const res = await fetch(`/api/admin/licenses${scopeQuery()}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "delete failed");
        }
        setLicenses((prev) => prev.filter((l) => l.key !== key));
        toast.success("License key dihapus");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menghapus license key");
      }
    },
    [isAllPeriods, scopeQuery]
  );

  const handleFormSave = useCallback(() => {
    setFormOpen(false);
    setEditingLicense(null);
    fetchData();
  }, [fetchData]);

  const filtered = licenses.filter(
    (l) =>
      l.key.toLowerCase().includes(search.toLowerCase()) ||
      l.name.toLowerCase().includes(search.toLowerCase())
  );

  const deviceIcon = (type: string) => {
    if (type === "mobile") return <Smartphone className="h-3 w-3" />;
    if (type === "tablet") return <Tablet className="h-3 w-3" />;
    return <Monitor className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              License Keys
              <Badge variant="secondary" className="ml-1">
                {licenses.length}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditingLicense(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari key atau nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? "Tidak ditemukan" : "Belum ada license key"}
            </p>
          ) : (
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              <div className="space-y-2">
                {filtered.map((license) => {
                  const activation = activations.find(
                    (a) => a.licenseKey === license.key
                  );
                  const devs = activation
                    ? devices.filter((d) => d.activationId === activation.id)
                    : [];

                  return (
                    <div
                      key={license.key}
                      className="rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedLicenseKey(license.key)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-semibold">
                              {license.key}
                            </code>
                            {license.isAdmin && (
                              <Badge variant="admin-outline" className="gap-0.5 text-[10px]">
                                <Shield className="h-2.5 w-2.5" />
                                Admin
                              </Badge>
                            )}
                            {license.packageTier === "diamond" && (
                              <Badge variant="diamond-outline" className="gap-0.5 text-[10px]">
                                Diamond
                              </Badge>
                            )}
                            {(license.packageTier === "vip" || license.packageTier === "diamond") && (
                              <Badge variant="vip-outline" className="gap-0.5 text-[10px]">
                                VIP
                              </Badge>
                            )}
                            {license.isTester && (
                              <Badge variant="tester-outline" className="gap-0.5 text-[10px]">
                                <FlaskConical className="h-2.5 w-2.5" />
                                Tester
                              </Badge>
                            )}
                            {license.suspendedUntil && (
                              <Badge variant="destructive" className="text-[10px]">
                                Suspended
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {license.name}
                          </p>
                          {isAllPeriods && license.semester !== undefined && (
                            <Badge variant="outline" className="mt-1 text-[10px] font-mono">
                              s{license.semester}-{license.examPeriod}-{license.jurusan}
                            </Badge>
                          )}
                          {activation && (
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {activation.userName} &middot;{" "}
                                {formatDistanceToNow(
                                  new Date(activation.activatedAt),
                                  { addSuffix: true, locale: idLocale }
                                )}
                              </span>
                              {devs.length > 0 && (
                                <span className="flex items-center gap-1">
                                  {devs.map((d) => (
                                    <span
                                      key={d.id}
                                      className="inline-flex items-center gap-0.5"
                                      title={d.deviceLabel || d.deviceType}
                                    >
                                      {deviceIcon(d.deviceType)}
                                    </span>
                                  ))}
                                  {devs.length}/{license.maxDevices}
                                </span>
                              )}
                            </div>
                          )}
                          {oauthLinks[license.key]?.email && (
                            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {oauthLinks[license.key].email}
                            </p>
                          )}
                          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                            <span>Quiz: {license.totalQuizScore}</span>
                            <span>Online: {license.totalOnlineMinutes}m</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLicense(license);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
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
                            description={t("confirm.delete_license")}
                            onConfirm={() => handleDelete(license.key)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLicense ? "Edit License Key" : "Buat License Key"}
            </DialogTitle>
          </DialogHeader>
          <LicenseForm
            license={editingLicense}
            onSave={handleFormSave}
            onCancel={() => {
              setFormOpen(false);
              setEditingLicense(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      {selectedLicenseKey && (() => {
        const lic = licenses.find((l) => l.key === selectedLicenseKey);
        if (!lic) return null;
        const act = activations.find((a) => a.licenseKey === selectedLicenseKey);
        const devs = act ? devices.filter((d) => d.activationId === act.id) : [];
        const profile = profiles[selectedLicenseKey] || { email: null, phone: null };
        return (
          <UserDetailDialog
            license={lic}
            activation={act}
            devices={devs}
            profileEmail={profile.email}
            profilePhone={profile.phone}
            linkedEmail={oauthLinks[lic.key]?.email ?? null}
            onLinkedEmailChange={(email) => {
              setOauthLinks((prev) => {
                const next = { ...prev };
                if (email) {
                  next[lic.key] = {
                    email,
                    linkedAt: new Date().toISOString(),
                    provider: "google",
                  };
                } else {
                  delete next[lic.key];
                }
                return next;
              });
              setLicenses((prev) =>
                prev.map((l) => (l.key === lic.key ? { ...l, linkedEmail: email } : l))
              );
            }}
            open={!!selectedLicenseKey}
            onOpenChange={(open) => { if (!open) setSelectedLicenseKey(null); }}
          />
        );
      })()}
    </div>
  );
}
