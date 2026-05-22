"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LicenseKey } from "@/types";

interface LicenseFormProps {
  license: LicenseKey | null;
  onSave: () => void;
  onCancel: () => void;
}

export function LicenseForm({ license, onSave, onCancel }: LicenseFormProps) {
  const isEdit = !!license;

  const [key, setKey] = useState(license?.key || "");
  const [name, setName] = useState(license?.name || "");
  const [maxDevices, setMaxDevices] = useState(license?.maxDevices || 2);
  const [unlimitedDevices, setUnlimitedDevices] = useState(
    license?.unlimitedDevices || false
  );
  const [isAdmin, setIsAdmin] = useState(license?.isAdmin || false);
  const [isTester, setIsTester] = useState(license?.isTester || false);
  const [packageTier, setPackageTier] = useState<"share" | "normal" | "vip" | "diamond">(license?.packageTier || "normal");
  const [linkedEmail, setLinkedEmail] = useState(license?.linkedEmail || "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isEdit && !key.trim()) {
        toast.error("Key harus diisi");
        return;
      }
      if (!name.trim()) {
        toast.error("Nama harus diisi");
        return;
      }
      const emailTrim = linkedEmail.trim();
      if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        setEmailError("Format email tidak valid");
        return;
      }
      setEmailError(null);

      setSaving(true);

      try {
        if (isEdit) {
          const res = await fetch("/api/admin/licenses", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: license.key,
              name,
              maxDevices,
              unlimitedDevices,
              isAdmin,
              isTester,
              packageTier,
              linkedEmail: emailTrim ? emailTrim : null,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed");
          }
          toast.success("License key diperbarui");
        } else {
          const res = await fetch("/api/admin/licenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: key.trim(),
              name: name.trim(),
              maxDevices,
              unlimitedDevices,
              isAdmin,
              isTester,
              packageTier,
              ...(emailTrim ? { linkedEmail: emailTrim } : {}),
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed");
          }
          toast.success("License key dibuat");
        }
        onSave();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal menyimpan"
        );
      }

      setSaving(false);
    },
    [isEdit, key, name, maxDevices, unlimitedDevices, isAdmin, isTester, packageTier, linkedEmail, license, onSave]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="lf-key">License Key</Label>
          <Input
            id="lf-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="B29-XXXXXX"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="lf-name">Nama</Label>
        <Input
          id="lf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama pemilik"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lf-devices">Max Devices</Label>
        <Input
          id="lf-devices"
          type="number"
          min={1}
          max={10}
          value={maxDevices}
          onChange={(e) => setMaxDevices(parseInt(e.target.value) || 2)}
          disabled={unlimitedDevices}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="lf-unlimited">Unlimited Devices</Label>
          <Switch
            id="lf-unlimited"
            checked={unlimitedDevices}
            onCheckedChange={setUnlimitedDevices}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="lf-admin">Admin</Label>
          <Switch
            id="lf-admin"
            checked={isAdmin}
            onCheckedChange={setIsAdmin}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="lf-tester">Tester</Label>
          <Switch
            id="lf-tester"
            checked={isTester}
            onCheckedChange={setIsTester}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Package Tier</Label>
        <Select value={packageTier} onValueChange={(v) => setPackageTier(v as "share" | "normal" | "vip" | "diamond")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="share">Share</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="diamond">Diamond</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lf-linked-email">Email user (Gmail, opsional)</Label>
        <Input
          id="lf-linked-email"
          type="email"
          value={linkedEmail}
          onChange={(e) => {
            setLinkedEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          onBlur={() => {
            const trim = linkedEmail.trim();
            if (trim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim)) {
              setEmailError("Format email tidak valid");
            }
          }}
          placeholder="user@gmail.com"
        />
        {emailError && (
          <p className="text-xs text-destructive">{emailError}</p>
        )}
        <p className="text-[11px] text-muted-foreground/85">
          Jika diisi, user bisa login via tombol &ldquo;Lanjut dengan Google&rdquo;.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Simpan" : "Buat"}
        </Button>
      </div>
    </form>
  );
}
