"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  ChevronDown,
  Copy,
  Gift,
  Loader2,
  Power,
  Trash2,
  Trophy,
  Wallet,
} from "@/components/ui/icons";

interface Campaign {
  code: string;
  label: string;
  active: boolean;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
  redeemed: number;
}

interface Earner {
  code: string;
  kind: string;
  who: string;
  used: number;
}

/**
 * Campaign referral codes.
 *
 * Personal codes are not listed or editable here: every account gets exactly
 * one, automatically, and it is theirs. This screen is for the codes handed
 * out deliberately — a class code, a promo, a partner — which is why they are
 * the only ones with a cap and an expiry.
 */
interface Invitee {
  who: string;
  joinedAt: string;
  credited: boolean;
}

export function ReferralCodes() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leaderboard, setLeaderboard] = useState<Earner[]>([]);
  const [invitees, setInvitees] = useState<Record<string, Invitee[]>>({});
  const [outstanding, setOutstanding] = useState(0);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/referral");
      const data = (await res.json()) as {
        campaigns?: Campaign[];
        leaderboard?: Earner[];
        invitees?: Record<string, Invitee[]>;
        outstanding?: number;
      };
      setCampaigns(data.campaigns ?? []);
      setLeaderboard(data.leaderboard ?? []);
      setInvitees(data.invitees ?? {});
      setOutstanding(data.outstanding ?? 0);
    } catch {
      toast.error("Gagal memuat kode referral");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, label, maxUses, expiresAt }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal membuat kode");
        return;
      }
      toast.success(`Kode ${code.toUpperCase()} dibuat`);
      setCode("");
      setLabel("");
      setMaxUses("");
      setExpiresAt("");
      await load();
    } catch {
      toast.error("Koneksi bermasalah");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Campaign) => {
    await fetch("/api/admin/referral", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c.code, active: !c.active }),
    });
    await load();
  };

  const remove = async (c: Campaign) => {
    const res = await fetch(`/api/admin/referral?code=${encodeURIComponent(c.code)}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { deactivated?: boolean; message?: string };
    if (data.deactivated) toast.info(data.message ?? "Kode dimatikan");
    await load();
  };

  return (
    <div className="space-y-6">
      {/* No payout screen any more: the reward is balance, spent automatically
          on the referrer's next purchase, so there is nothing to transfer by
          hand. What is left is the liability — worth seeing, not worth acting
          on. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo referral beredar
            </span>
            <span className="text-sm font-semibold text-foreground">
              Rp{outstanding.toLocaleString("id-ID")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Saldo yang sudah diperoleh pengajak tapi belum dipakai. Tidak perlu kamu
            transfer: otomatis mengurangi harga saat mereka beli periode berikutnya, dan
            hangus kalau menganggur 12 bulan.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Buat kode kampanye
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-code">Kode</Label>
              <Input
                id="ref-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="LE86HEMAT"
                maxLength={32}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-label">Keterangan</Label>
              <Input
                id="ref-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Promo kelas LE86"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-max">Batas pemakaian</Label>
              <Input
                id="ref-max"
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Kosongkan = tanpa batas"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-exp">Berlaku sampai</Label>
              <Input
                id="ref-exp"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Kode pribadi tiap akun dibuat otomatis dan tidak diatur dari sini. Yang di
            halaman ini cuma kode yang kamu bagikan sendiri.
          </p>
          <Button onClick={create} disabled={saving || code.trim().length < 4}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Buat kode
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kode kampanye</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Memuat...</p>
          ) : campaigns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada kode kampanye.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {campaigns.map((c) => {
                const expired =
                  c.expires_at && new Date(c.expires_at).getTime() < Date.now();
                const full =
                  typeof c.max_uses === "number" && c.redeemed >= c.max_uses;
                return (
                  <li
                    key={c.code}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{c.code}</span>
                        {/* Why it is unusable, spelled out. The public checker
                            deliberately refuses to say; there is nobody to
                            protect from here. */}
                        {!c.active && <Badge variant="secondary">mati</Badge>}
                        {expired && <Badge variant="destructive">kedaluwarsa</Badge>}
                        {full && <Badge variant="destructive">kuota habis</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.label || "tanpa keterangan"} · dipakai {c.redeemed}
                        {typeof c.max_uses === "number" ? ` dari ${c.max_uses}` : ""}
                        {c.expires_at
                          ? ` · sampai ${new Date(c.expires_at).toLocaleDateString("id-ID")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(c.code);
                          toast.success("Kode disalin");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggle(c)}>
                        <Power className={c.active ? "h-4 w-4 text-primary" : "h-4 w-4"} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(c)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Siapa yang mengajak
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada kode yang pernah dipakai.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {leaderboard.map((e) => {
                const list = invitees[e.code] ?? [];
                const open = openCode === e.code;
                return (
                  <li key={e.code}>
                    {/* Clickable: "8 orang" is the number the owner will be
                        asked to justify, so the eight names have to be one tap
                        away rather than a database query. */}
                    <button
                      type="button"
                      onClick={() => setOpenCode(open ? null : e.code)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.who}</p>
                        <p className="font-mono text-xs text-muted-foreground">{e.code}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
                        {e.used} orang
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>

                    {open && (
                      <ul className="mb-2.5 ml-1 flex flex-col gap-1 border-l border-border pl-3">
                        {list.length === 0 ? (
                          <li className="py-1.5 text-xs text-muted-foreground">
                            Belum ada rinciannya.
                          </li>
                        ) : (
                          list.map((inv, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between gap-3 py-1"
                            >
                              <span className="min-w-0 truncate text-xs text-foreground">
                                {inv.who}
                                <span className="ml-1.5 text-muted-foreground">
                                  {new Date(inv.joinedAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              </span>
                              <span
                                className={`shrink-0 text-[11px] font-semibold ${
                                  inv.credited ? "text-primary" : "text-muted-foreground"
                                }`}
                              >
                                {inv.credited ? "dihitung" : "belum beli"}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
