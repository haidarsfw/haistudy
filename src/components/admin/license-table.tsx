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
  Clock,
  Trophy,
  Calendar,
  Globe,
  User,
  Copy,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LicenseForm } from "./license-form";
import type { LicenseKey, Activation, Device } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function formatOnlineTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Full user detail dialog shown when admin clicks a license row */
function UserDetailDialog({
  license,
  activation,
  devices: devs,
  open,
  onOpenChange,
}: {
  license: LicenseKey;
  activation: Activation | undefined;
  devices: Device[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(license.key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
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
                <InfoField icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={activation.email || "—"} />
                <InfoField icon={<Globe className="h-3.5 w-3.5" />} label="Referral Code" value={activation.referralCode || "—"} />
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

          {/* Meta */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Max devices: {license.unlimitedDevices ? "Unlimited" : license.maxDevices}</p>
            <p>Days active: {license.daysActive}</p>
            <p>Created: {format(new Date(license.createdAt), "d MMM yyyy, HH:mm", { locale: idLocale })}</p>
          </div>
        </div>
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
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<LicenseKey | null>(null);
  const [selectedLicenseKey, setSelectedLicenseKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/licenses");
      const data = await res.json();
      setLicenses(data.licenses || []);
      setActivations(data.activations || []);
      setDevices(data.devices || []);
    } catch {
      toast.error("Gagal memuat data lisensi");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { t } = useTranslation();

  const handleDelete = useCallback(
    async (key: string) => {
      try {
        const res = await fetch("/api/admin/licenses", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (!res.ok) throw new Error();
        setLicenses((prev) => prev.filter((l) => l.key !== key));
        toast.success("License key dihapus");
      } catch {
        toast.error("Gagal menghapus license key");
      }
    },
    []
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
        return (
          <UserDetailDialog
            license={lic}
            activation={act}
            devices={devs}
            open={!!selectedLicenseKey}
            onOpenChange={(open) => { if (!open) setSelectedLicenseKey(null); }}
          />
        );
      })()}
    </div>
  );
}
