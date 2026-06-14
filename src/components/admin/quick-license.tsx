"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Copy,
  Check,
  MessageCircle,
  Pencil,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { scopeKey } from "@/lib/scope";
import { scopeCompact } from "@/components/admin/scope-dropdown-content";

const PACKAGE_OPTIONS = [
  { id: "share", label: "Share (Rp25.000)", tier: "share" as const },
  { id: "normal", label: "Normal (Rp30.000)", tier: "normal" as const },
  { id: "vip", label: "VIP (Rp35.000)", tier: "vip" as const },
  { id: "diamond", label: "Diamond (Rp50.000+)", tier: "diamond" as const },
  { id: "free", label: "Free", tier: "normal" as const },
] as const;

export function QuickLicense() {
  const { adminScope, isAllPeriods, hydrated } = useAdminScope();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pkg, setPkg] = useState<string>("share");
  const [devices, setDevices] = useState(2);
  const [freeReason, setFreeReason] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState<number | null>(null);
  const [editingInvoice, setEditingInvoice] = useState(false);
  const editingRef = useRef(false);
  const [tempInvoice, setTempInvoice] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  // The invoice counter is per-scope (shares the real purchase sequence). Null
  // when "all periods" is active - the counter is per-scope only.
  const counterScope =
    hydrated && !isAllPeriods && adminScope !== "all" ? scopeKey(adminScope) : null;

  // Read the resolved scope's counter; DISPLAY the upcoming number (value + 1).
  // Re-fetches when the admin scope changes + polls for cross-device sync.
  useEffect(() => {
    if (!counterScope) {
      setInvoiceNumber(null);
      return;
    }
    const fetchCounter = () => {
      if (editingRef.current) return;
      fetch(`/api/admin/invoice-counter?scope=${counterScope}&t=${Date.now()}`)
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.value === "number" && !editingRef.current) {
            const next = data.value + 1;
            setInvoiceNumber(next);
            setTempInvoice(String(next));
          }
        })
        .catch(console.error);
    };

    fetchCounter();
    const interval = setInterval(fetchCounter, 30_000);
    return () => clearInterval(interval);
  }, [counterScope]);

  const handleGenerate = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Nama harus diisi");
      return;
    }
    if (isAllPeriods || adminScope === "all") {
      toast.error("Pilih scope spesifik dulu di admin header sebelum create license.");
      return;
    }
    setSaving(true);

    const prefix = "B29";
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newKey = `${prefix}-${random}`;

    const selectedPackage = PACKAGE_OPTIONS.find((p) => p.id === pkg);
    const derivedTier = selectedPackage?.tier || "normal";
    const packageLabel =
      pkg === "free"
        ? `${freeReason || "Free"} (Free)`
        : selectedPackage?.label || "";

    const today = new Date();
    const dateStr = today.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    try {
      const scopeKeyStr = scopeKey(adminScope);
      // Create license key via API
      const res = await fetch(`/api/admin/licenses?scope=${scopeKeyStr}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey,
          name: name.trim(),
          isAdmin: false,
          isTester: false,
          maxDevices: devices,
          packageTier: derivedTier,
          scope: scopeKeyStr,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create key");
      }

      setGeneratedKey(newKey);

      // Assign the real per-scope invoice number (same sequence as purchases).
      let assigned = invoiceNumber ?? 1;
      try {
        const invRes = await fetch(
          `/api/admin/invoice-counter/next?scope=${scopeKeyStr}`,
          { method: "POST" }
        );
        const invData = await invRes.json();
        if (typeof invData.value === "number") assigned = invData.value;
      } catch {
        /* fall back to the displayed number */
      }

      // Build WhatsApp message
      const message = `🧾 INVOICE #${String(assigned).padStart(3, "0")}
haistudy
Halo ${name.trim()}, pembayaran kamu sudah kami terima.

Berikut detail pesananmu:
📅 Tanggal: ${dateStr}
👤 ID: ${name.trim()}
📦 Paket: ${packageLabel}
✅ Status: LUNAS

🔐 YOUR LICENSE KEY:
${newKey}
(Copy kode di atas)

🌍 AKSES WEBSITE:
https://haistudy.site

⚠️ LANGKAH AKTIVASI (PENTING!):
Agar akunmu terverifikasi dan tidak kena banned, lakukan ini sekarang:
1. Buka website & masukkan License Key di atas.
2. Login menggunakan Device utama kamu (HP/Laptop).
3. Screenshot halaman utama (Dashboard) setelah berhasil masuk.
4. Kirim Screenshot-nya ke chat ini sebagai bukti validasi device.

Note: Sistem akan mengunci ID device sesuai screenshot yang dikirim.

Jangan share key ini ke orang lain ya!
Selamat belajar! 🚀`;

      setGeneratedMessage(message);

      // Counter advanced server-side; show the next upcoming number.
      setInvoiceNumber(assigned + 1);
      setTempInvoice(String(assigned + 1));

      toast.success("License key berhasil dibuat!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat key");
    }

    setSaving(false);
  }, [name, pkg, devices, freeReason, invoiceNumber, adminScope, isAllPeriods]);

  const handleSaveInvoice = useCallback(async () => {
    if (!counterScope) return;
    const display = parseInt(tempInvoice) || 1; // the upcoming invoice #
    const counterValue = Math.max(0, display - 1); // stored = last issued
    try {
      await fetch(`/api/admin/invoice-counter?scope=${counterScope}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: counterValue }),
      });
      setInvoiceNumber(display);
      setTempInvoice(String(display));
      editingRef.current = false;
      setEditingInvoice(false);
      toast.success("Invoice counter diperbarui");
    } catch {
      toast.error("Gagal menyimpan invoice counter");
    }
  }, [tempInvoice, counterScope]);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const openWhatsApp = useCallback(() => {
    if (!whatsapp.trim() || !generatedMessage) return;
    let phone = whatsapp.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(generatedMessage)}`;
    window.open(url, "_blank");
  }, [whatsapp, generatedMessage]);

  const lockedAllPeriods = hydrated && (isAllPeriods || adminScope === "all");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Quick License Generator
            {hydrated && !lockedAllPeriods && adminScope !== "all" && (
              <Badge variant="secondary" className="ml-auto text-[10px] font-mono">
                → {scopeCompact(adminScope)}
              </Badge>
            )}
          </CardTitle>
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
                  License creation harus terbind ke 1 scope spesifik. Switch scope di admin header dulu.
                </p>
              </div>
            </div>
          )}
          {/* Invoice number */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Invoice #</span>
            {editingInvoice ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={tempInvoice}
                  onChange={(e) => setTempInvoice(e.target.value)}
                  className="h-7 w-20"
                />
                <Button size="sm" variant="ghost" onClick={handleSaveInvoice}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (invoiceNumber === null) return;
                  setTempInvoice(String(invoiceNumber));
                  editingRef.current = true;
                  setEditingInvoice(true);
                }}
                className="flex items-center gap-1 text-sm font-medium hover:text-primary"
              >
                {invoiceNumber === null ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  String(invoiceNumber).padStart(3, "0")
                )}
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-name">Nama</Label>
              <Input
                id="quick-name"
                placeholder="Nama pembeli"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-wa">WhatsApp</Label>
              <Input
                id="quick-wa"
                placeholder="08xxxxxxxxxx"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Paket</Label>
              <Select value={pkg} onValueChange={(v) => v && setPkg(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_OPTIONS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-devices">Max Devices</Label>
              <Input
                id="quick-devices"
                type="number"
                min={1}
                max={10}
                value={devices}
                onChange={(e) => setDevices(parseInt(e.target.value) || 2)}
              />
            </div>
            {pkg === "free" && (
              <div className="space-y-2">
                <Label htmlFor="quick-reason">Alasan Free</Label>
                <Input
                  id="quick-reason"
                  placeholder="e.g. Referral reward"
                  value={freeReason}
                  onChange={(e) => setFreeReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={saving || !name.trim() || invoiceNumber === null || lockedAllPeriods}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Generate License Key
            {!lockedAllPeriods && adminScope !== "all" && hydrated && (
              <span className="ml-2 text-[11px] opacity-70">
                → {scopeCompact(adminScope)}
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated result */}
      {generatedKey && (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-mono text-sm">
                {generatedKey}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(generatedKey)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {generatedMessage && (
              <>
                <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                  {generatedMessage}
                </pre>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedMessage)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy Message
                  </Button>
                  {whatsapp && (
                    <Button size="sm" onClick={openWhatsApp}>
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                      Kirim via WhatsApp
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
