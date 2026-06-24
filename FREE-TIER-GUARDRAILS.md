# Free-Tier Guardrails (Supabase + Vercel)

Tujuan: situs **tetap nyala & ringan** di Supabase Free + Vercel Hobby, tanpa
bikin terasa lambat/kaku. Dokumen ini = aturan + cara cek + riwayat masalah,
supaya kejadian "Supabase down / Vercel CPU habis" **tidak terulang**.

---

## 1. Apa yang pernah bikin down (akar masalah)

1. **Realtime retry-loop (penyebab utama site down).**
   `postgres_changes` dengan `filter:` akan **DITOLAK Postgres** kalau kolom yang
   difilter tidak masuk **REPLICA IDENTITY** tabel. Subscription yang ditolak
   **mengulang terus selamanya** → banjir error + WAL + IO → DB megap-megap.
   Dulu terjadi di `user_settings` (filter `license_key`) & `dm_messages`
   (filter `semester`). Fix: hapus sub `user_settings` (mig 057), hapus filter
   `dm_messages`, dan **set semua tabel publikasi ke REPLICA IDENTITY FULL**
   (mig 058) sebagai pengaman permanen.

2. **"Kelempar ke preview" (bukan down, tapi ganggu).**
   localStorage menyimpan sesi PREVIEW lama; cookie httpOnly (sumber kebenaran)
   tidak bisa ditulis oleh callback Google → UI sempat render preview. Fix:
   cookie jadi sumber kebenaran, localStorage preview tidak boleh "memutuskan".

3. **Vercel CPU habis (Fluid Active CPU 4h/bulan).**
   Bug preview bikin user **refresh berulang** → tiap refresh = render SSR +
   mint token realtime (crypto) + `/api/auth/me` = makan Active CPU. Plus
   prefetch nav mobile + middleware jalan di tiap `/api`. Semua sudah dipangkas.

---

## 2. Aturan wajib (biar tidak terulang)

1. **JANGAN `filter:` di `postgres_changes`** kecuali tabelnya
   `REPLICA IDENTITY FULL`. Cek dulu (query di bawah). Lebih aman: RLS + filter
   manual di client dari `payload.new`.
2. **JANGAN menambah tabel ke publication `supabase_realtime`** tanpa
   `ALTER TABLE x REPLICA IDENTITY FULL;` lebih dulu.
3. **Auth: cookie httpOnly = sumber kebenaran.** Sesi localStorage `isPreview`
   tidak boleh dipakai render final sebelum dicek ke `/api/auth/me`.
4. **Polling/prefetch:** jangan ada poll tanpa throttle di tiap mount; channel
   realtime dipasang di level app-shell (sekali), bukan per-halaman.
5. **Kalau mengejar beban: tarik telemetry, jangan cuma baca kode.** Audit kode
   saja TIDAK kelihatan beban asli — wajib query `pg_stat_*` (lihat bawah).
6. **Heartbeat presence**: 5 menit (visible) / 15 menit (hidden). Stale cutoff
   HARUS > interval heartbeat (sekarang 360s) atau user online "kedip" offline.

---

## 3. Batas free-tier (yang penting)

**Supabase Free:** 500MB DB, 5GB egress/bln, 2M pesan realtime/bln, IO budget
harian terbatas (micro compute). Sinyal bahaya = **WRITES (WAL) + temp files**,
bukan reads (cache kita 100%).

**Vercel Hobby:** **4 jam Fluid Active CPU/bln** (ini yang pernah lewat), 1M
invocations, 100GB bandwidth, **2 cron jobs**. ⚠️ **Usage dihitung per-AKUN,
dibagi SEMUA project** (haistudy + 5 lainnya), reset tiap tanggal 1.

---

## 4. Cara cek (monitoring queries)

Jalankan via Supabase SQL editor / MCP. Reset baseline tidak perlu — lihat
proporsi & tren.

```sql
-- A. IO itu reads atau writes? (cache hit harus ~100%; cek temp_files & writes)
select blks_read, round(100.0*blks_hit/nullif(blks_hit+blks_read,0),2) cache_pct,
       temp_files, pg_size_pretty(temp_bytes) temp, xact_commit
from pg_stat_database where datname = current_database();

-- B. Tabel paling banyak ditulis (WAL = IO)
select relname, n_tup_ins ins, n_tup_upd upd, n_tup_del del, n_dead_tup dead,
       seq_scan, autovacuum_count
from pg_stat_user_tables order by (n_tup_ins+n_tup_upd+n_tup_del) desc limit 15;

-- C. Query paling sering (driver invocations + CPU)
select calls, round(mean_exec_time::numeric,2) mean_ms, left(query,90) q
from pg_stat_statements order by calls desc limit 20;

-- D. PENGAMAN LOOP: semua tabel realtime harus FULL (still_default harus NULL)
select count(*) filter (where c.relreplident='f') full_ri,
       count(*) filter (where c.relreplident='d') default_ri,
       string_agg(c.relname,', ') filter (where c.relreplident='d') still_default
from pg_publication_tables pt
join pg_class c on c.relname=pt.tablename
join pg_namespace n on n.oid=c.relnamespace and n.nspname=pt.schemaname
where pt.pubname='supabase_realtime';

-- E. Realtime subscription churn (kalau naik terus saat idle = ada loop!)
select (select count(*) from realtime.subscription) live_subs,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(),'0/0')) total_wal;
```

**Vercel:** Dashboard → Observability → group by **Project** (lihat siapa makan
CPU) ; Usage → Fluid Active CPU. Kalau naik cepat: pause project yang tidak
dipakai (CPU dibagi seluruh akun).

---

## 5. Yang sudah dipangkas (riwayat)

preview-trap fix · presence 1x upsert/beat · voice seed guard · online-list
stale 360s · online-users poll 5m · announcements dedup · version-check throttle
· mobile prefetch dihapus · middleware off `/api/*` · realtime-loop fix (mig 057)
· semua tabel realtime → REPLICA IDENTITY FULL (mig 058).

Lihat commit history untuk detail tiap perubahan.
