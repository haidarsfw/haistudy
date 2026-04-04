"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

const PACKAGE_OPTIONS = [
  { id: "share", label: "Share (Rp20.000)", tier: "share" as const },
  { id: "normal", label: "Normal (Rp25.000)", tier: "normal" as const },
  { id: "vip", label: "VIP (Rp30.000)", tier: "vip" as const },
  { id: "free", label: "Free", tier: "normal" as const },
] as const;

export function QuickLicense() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pkg, setPkg] = useState<string>("share");
  const [devices, setDevices] = useState(2);
  const [freeReason, setFreeReason] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(90);
  const [editingInvoice, setEditingInvoice] = useState(false);
  const [tempInvoice, setTempInvoice] = useState("90");
  const [generatedKey, setGeneratedKey] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch invoice counter on mount + subscribe to realtime changes + polling fallback
  useEffect(() => {
    const fetchCounter = () => {
      fetch("/api/admin/invoice")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.value === "number") {
            setInvoiceNumber(data.value);
            setTempInvoice(String(data.value));
          }
        })
        .catch(console.error);
    };

    // Initial fetch
    fetchCounter();

    // Subscribe to realtime changes on invoice_counter table
    const supabase = createBrowserClient();
    if (supabase) {
      const channel = supabase
        .channel("invoice-counter-sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "invoice_counter",
          },
          (payload) => {
            const newValue = (payload.new as { value?: number })?.value;
            if (typeof newValue === "number") {
              setInvoiceNumber(newValue);
              setTempInvoice(String(newValue));
            }
          }
        )
        .subscribe();

      // Polling fallback every 5s in case realtime misses events
      const interval = setInterval(fetchCounter, 5_000);

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }

    // No Supabase: poll every 5s
    const interval = setInterval(fetchCounter, 5_000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Nama harus diisi");
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

    const currentInvoice = invoiceNumber;

    try {
      // Create license key via API
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey,
          name: name.trim(),
          isAdmin: false,
          isTester: false,
          maxDevices: devices,
          packageTier: derivedTier,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create key");
      }

      setGeneratedKey(newKey);

      // Build WhatsApp message
      const message = `🧾 INVOICE #${String(currentInvoice).padStart(3, "0")}
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

      // Increment invoice counter
      const invoiceRes = await fetch("/api/admin/invoice", { method: "POST" });
      const invoiceData = await invoiceRes.json();
      setInvoiceNumber(invoiceData.value);
      setTempInvoice(String(invoiceData.value));

      toast.success("License key berhasil dibuat!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat key");
    }

    setSaving(false);
  }, [name, pkg, devices, freeReason, invoiceNumber]);

  const handleSaveInvoice = useCallback(async () => {
    const value = parseInt(tempInvoice) || 90;
    try {
      await fetch("/api/admin/invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      setInvoiceNumber(value);
      setEditingInvoice(false);
      toast.success("Invoice counter diperbarui");
    } catch {
      toast.error("Gagal menyimpan invoice counter");
    }
  }, [tempInvoice]);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Quick License Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  setTempInvoice(String(invoiceNumber));
                  setEditingInvoice(true);
                }}
                className="flex items-center gap-1 text-sm font-medium hover:text-primary"
              >
                {String(invoiceNumber).padStart(3, "0")}
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
            disabled={saving || !name.trim()}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Generate License Key
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
