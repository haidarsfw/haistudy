"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useTranslation } from "@/components/providers/language-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "lucide-react";
import { toast } from "sonner";
import { LicenseForm } from "./license-form";
import type { LicenseKey, Activation, Device } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export function LicenseTable() {
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<LicenseKey | null>(null);

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
            <ScrollArea className="max-h-[500px]">
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
                      className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
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
                            {license.packageTier === "vip" && (
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
                            onClick={() => {
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
            </ScrollArea>
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
    </div>
  );
}
