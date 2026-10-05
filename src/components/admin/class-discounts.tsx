"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { GraduationCap, Loader2, Trash2 } from "@/components/ui/icons";
import { PURCHASABLE_SCOPES, scopeKey, scopeFullLabel } from "@/lib/scope";

interface Row {
  class_code: string;
  semester: number;
  exam_period: string;
  jurusan: string;
  percent: number;
  note: string | null;
}

const rowScopeKey = (r: Row) => `s${r.semester}-${r.exam_period}-${r.jurusan}`;

/**
 * The class promo, one period at a time.
 *
 * The rule this screen exists to express: only the class you are sitting in,
 * only for that exam period. It used to be a price written into the source, so
 * a class you had left kept its discount until someone deployed a change. Here,
 * a period that has passed simply has no row.
 */
export function ClassDiscounts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classCode, setClassCode] = useState("");
  const [sk, setSk] = useState(
    scopeKey(PURCHASABLE_SCOPES[PURCHASABLE_SCOPES.length - 1])
  );
  const [percent, setPercent] = useState("15");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/class-discount");
      const data = (await res.json()) as { rows?: Row[]; error?: string };
      if (data.error) throw new Error(data.error);
      setRows(data.rows ?? []);
    } catch {
      toast.error("Gagal memuat promo kelas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!classCode.trim()) {
      toast.error("Isi dulu kode kelasnya.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/class-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode, scopeKey: sk, percent: Number(percent), note }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.error) throw new Error(data.error);
      toast.success("Promo kelas disimpan.");
      setClassCode("");
      setNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Row) => {
    try {
      const res = await fetch(
        `/api/admin/class-discount?classCode=${encodeURIComponent(r.class_code)}&scopeKey=${encodeURIComponent(rowScopeKey(r))}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.error) throw new Error(data.error);
      toast.success("Promo dihentikan.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-primary" />
          Promo kelas
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Potongan untuk satu kelas, satu periode ujian, paket Share saja. Periode yang
          sudah lewat tinggal tidak punya baris di sini, jadi promonya berhenti sendiri.
          Kelas yang dapat promo juga wajib 2 bukti kalau memilih Broadcast.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cd-class" className="text-xs">
              Kode kelas
            </Label>
            <Input
              id="cd-class"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              placeholder="LE86"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-scope" className="text-xs">
              Periode
            </Label>
            <select
              id="cd-scope"
              value={sk}
              onChange={(e) => setSk(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {/* Only periods that are actually on sale: a promo on a period
                  nobody can buy is a promo nobody can use. */}
              {PURCHASABLE_SCOPES.map((s) => (
                <option key={scopeKey(s)} value={scopeKey(s)}>
                  {scopeFullLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-percent" className="text-xs">
              Persen
            </Label>
            <Input
              id="cd-percent"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              inputMode="numeric"
              placeholder="15"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-note" className="text-xs">
              Catatan
            </Label>
            <Input
              id="cd-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="kelas saya semester ini"
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan promo"}
        </Button>

        <div className="border-t border-border pt-4">
          {loading ? (
            <p className="text-xs text-muted-foreground">Memuat…</p>
          ) : rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada kelas yang dapat promo. Tanpa baris di sini, tidak ada kelas yang
              dapat potongan.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li
                  key={`${r.class_code}-${rowScopeKey(r)}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.class_code}
                      <span className="ml-2 font-normal text-primary">{r.percent}%</span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {scopeFullLabel({
                        semester: r.semester,
                        examPeriod: r.exam_period as "uts" | "uas",
                        jurusan: r.jurusan,
                      })}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Hentikan promo ${r.class_code}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
