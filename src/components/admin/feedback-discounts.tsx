"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";

interface Row {
  email_lower: string;
  percent: number;
  note: string | null;
  created_at: string;
  used_at: string | null;
  used_amount: number | null;
}

/**
 * The evaluation thank-you allowlist.
 *
 * Sits beside the referral codes because both answer one question — how does
 * this person end up paying less — and splitting that across two tabs is how
 * two discounts end up contradicting each other unnoticed.
 *
 * Addresses rather than a coupon code: when the form went out almost nobody
 * answering had an account, so there was nothing to attach a credit to. The
 * address matches whenever they eventually buy.
 */
export function FeedbackDiscounts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [defaultPercent, setDefaultPercent] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emails, setEmails] = useState("");
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feedback-discount");
      const data = (await res.json()) as {
        rows?: Row[];
        defaultPercent?: number;
        error?: string;
      };
      if (data.error) throw new Error(data.error);
      setRows(data.rows ?? []);
      if (data.defaultPercent) setDefaultPercent(data.defaultPercent);
    } catch {
      toast.error("Gagal memuat daftar potongan evaluasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const used = useMemo(() => rows.filter((r) => r.used_at).length, [rows]);

  const add = async () => {
    if (!emails.trim()) {
      toast.error("Tempel dulu alamat emailnya.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/feedback-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, percent: Number(percent) || undefined, note }),
      });
      const data = (await res.json()) as {
        added?: number;
        skipped?: number;
        invalid?: string[];
        error?: string;
      };
      if (data.error) throw new Error(data.error);

      // Say what happened to every address, not just the ones that worked. A
      // silent "skipped" is how an admin concludes the list is complete when
      // it is not.
      const bits = [`${data.added ?? 0} ditambahkan`];
      if (data.skipped) bits.push(`${data.skipped} sudah ada`);
      if (data.invalid?.length) bits.push(`${data.invalid.length} tidak terbaca`);
      toast.success(bits.join(", "));

      setEmails("");
      setNote("");
      setPercent("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambahkan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (email: string) => {
    try {
      const res = await fetch(
        `/api/admin/feedback-discount?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.error) throw new Error(data.error);
      toast.success("Dihapus.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          Potongan evaluasi
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Alamat email yang berhak dapat potongan {defaultPercent}% sekali pakai, tanpa
          batas waktu. Potongannya muncul sendiri saat orangnya checkout dengan email
          yang sama. Tidak digabung dengan potongan lain, yang terbesar yang dipakai.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="fd-emails" className="text-xs">
              Tempel alamat email
            </Label>
            <textarea
              id="fd-emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder={"satu per baris, atau dipisah koma\nnama@gmail.com, lain@gmail.com"}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="flex flex-col gap-3 sm:w-40">
            <div className="space-y-1.5">
              <Label htmlFor="fd-percent" className="text-xs">
                Persen
              </Label>
              <Input
                id="fd-percent"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                inputMode="numeric"
                placeholder={String(defaultPercent)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fd-note" className="text-xs">
                Catatan
              </Label>
              <Input
                id="fd-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ronde evaluasi"
              />
            </div>
          </div>
        </div>

        <Button onClick={add} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambahkan"}
        </Button>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            {loading
              ? "Memuat…"
              : `${rows.length} alamat, ${used} sudah dipakai`}
          </p>

          {!loading && rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada alamat di daftar ini.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li
                  key={r.email_lower}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.email_lower}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.percent}%
                      {r.note ? ` · ${r.note}` : ""}
                      {r.used_at
                        ? ` · dipakai ${new Date(r.used_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}`
                        : ""}
                    </p>
                  </div>
                  {r.used_at ? (
                    // Not removable once spent: deleting the row would erase
                    // the proof it was used, and the same address could be
                    // added back and claim it again.
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                      terpakai
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => remove(r.email_lower)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Hapus ${r.email_lower}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
