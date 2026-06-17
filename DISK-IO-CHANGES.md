# Disk IO Reduction — Laporan Perubahan & Panduan Rollback

**Tanggal:** 2026-06-17
**Branch:** `round9-payments` → di-deploy ke `main`
**App commit:** `731d360`
**DB migration:** `supabase/migrations/047_realtime_io_reduction.sql` (sudah diterapkan ke prod `gvjwxccwuyuhgexypgbn`)

Dokumen ini menjelaskan **apa yang diubah, kenapa, dan cara mengembalikannya** kalau
nanti perlu revert atau ubah sesuatu terkait perubahan Disk IO ini.

---

## 1. Kenapa diubah

Supabase mengirim email "Disk IO Budget depleting" (compute Free/NANO), padahal DB
kecil (50 MB, 15 MAU). Hasil investigasi `pg_stat_statements`:

- **Penyebab utama: Realtime WAL decoding** — query `SELECT wal->>…` dipanggil **5 juta+ kali** (~9 jam waktu eksekusi). Biayanya proporsional dengan **jumlah tulisan ke tabel yang ada di publication Realtime**.
- **`presence` adalah penulis terbanyak** (~43rb upsert heartbeat, **429× autovacuum**) TAPI **tidak ada satu pun klien yang subscribe** ke presence (daftar online pakai polling `fetchOnlineUsers` tiap 120 detik). Jadi WAL-nya diproses untuk "tidak ada siapa-siapa".
- Bukan masalah index — semua tabel kecil, jadi Postgres memang memilih seq scan.

---

## 2. Perubahan DATABASE (migration 047)

### 2A. Lepas 5 tabel dari publication `supabase_realtime`
`presence`, `announcements`, `purchase_requests`, `invoice_counter`, `scope_feature_flags`.
Semua hanya diakses via REST/polling, **nol subscriber realtime**.

> ⚠️ **PENTING untuk masa depan:** kalau nanti bikin fitur yang butuh update **instan/real-time** di salah satu tabel ini (mis. "pengumuman muncul tanpa refresh", "daftar online live"), tabelnya **wajib dimasukkan lagi** ke publication, kalau tidak event realtime-nya tidak akan jalan.

**Cara revert (kembalikan ke realtime):**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.presence, public.announcements, public.purchase_requests,
  public.invoice_counter, public.scope_feature_flags;
```

### 2B. Perbaikan RLS init-plan (18 policy `*_rt_select`)
Diubah dari `auth.jwt()` → `(select auth.jwt())` supaya dihitung 1× per query, bukan per baris. **Logika izin 100% sama** — hanya optimasi.

> **Tidak perlu di-revert.** Bentuk `(select auth.jwt())` lebih efisien dan hasilnya identik (rekomendasi resmi Supabase). Kalau tetap mau balik, ganti `(select auth.jwt())` → `auth.jwt()` di tiap policy (tidak disarankan, tanpa manfaat).

### 2C. Drop 10 index mubazir/tidak terpakai
Yang **di-drop**: `idx_support_messages_content_trgm` (GIN pencarian teks — fitur search support belum dipakai), `idx_support_messages_reply_to`, `idx_support_messages_key_created_active`, `idx_chat_messages_reply_to_id`, `idx_chat_read_positions_last_read_message_id`, `idx_forum_comments_parent_comment_id`, `idx_forum_comments_thread_created`, `idx_dm_messages_sender_key`, `idx_voice_participants_room`, `idx_announcements_created_at_desc`.

Yang **TETAP DIPERTAHANKAN** (jalur query utama saat data bertambah): `idx_forum_threads_scope_subject_created`, `idx_forum_comments_scope_thread_created`, `idx_support_messages_scope_key_created`, `idx_announcements_scope_active`.

> Kalau **fitur pencarian teks di support chat** mau diaktifkan lagi, buat ulang index trigram-nya:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_support_messages_content_trgm ON public.support_messages
  USING gin (content gin_trgm_ops) WHERE (deleted = false AND is_system = false);
```

**Cara revert (buat ulang semua index yang di-drop):**
```sql
CREATE INDEX idx_support_messages_reply_to ON public.support_messages USING btree (reply_to_id) WHERE (reply_to_id IS NOT NULL);
CREATE INDEX idx_support_messages_key_created_active ON public.support_messages USING btree (license_key, created_at) WHERE (deleted = false);
CREATE INDEX idx_chat_messages_reply_to_id ON public.chat_messages USING btree (reply_to_id) WHERE (reply_to_id IS NOT NULL);
CREATE INDEX idx_chat_read_positions_last_read_message_id ON public.chat_read_positions USING btree (last_read_message_id);
CREATE INDEX idx_forum_comments_parent_comment_id ON public.forum_comments USING btree (parent_comment_id) WHERE (parent_comment_id IS NOT NULL);
CREATE INDEX idx_forum_comments_thread_created ON public.forum_comments USING btree (thread_id, created_at);
CREATE INDEX idx_dm_messages_sender_key ON public.dm_messages USING btree (sender_key);
CREATE INDEX idx_voice_participants_room ON public.voice_participants USING btree (room_id);
CREATE INDEX idx_announcements_created_at_desc ON public.announcements USING btree (created_at DESC);
-- + blok trigram di atas
```

---

## 3. Perubahan APLIKASI (commit `731d360`)

| File | Lama → Baru | Cara revert |
|---|---|---|
| `src/lib/constants.ts` | `PRESENCE_HEARTBEAT_VISIBLE_MS` 60_000 → **120_000**; `PRESENCE_HEARTBEAT_HIDDEN_MS` 300_000 → **600_000** | kembalikan ke 60_000 / 300_000 |
| `src/lib/presence.ts` | `fetchOnlineUsers` `STALE_MS` 150_000 → **270_000** | kembalikan ke 150_000 |
| `src/components/admin/statistics.tsx` | Hapus subscription `postgres_changes` ke `license_keys`/`activations` (tidak pernah jalan karena tidak dipublish); poll 30s dipertahankan | re-add subscription kalau tabelnya dipublish lagi |

**Efek ke user:** praktis nol. Daftar online memang sudah polling 120 detik; status offline tetap **instan** saat tab ditutup (offline beacon). Realtime untuk chat/DM/forum/support/notifikasi/voice **tidak disentuh**.

---

## 4. Cara ROLLBACK PENUH

1. **App:**
   ```bash
   git revert 731d360
   git push origin <branch>:main
   ```
   (atau ubah manual 3 file di tabel atas)
2. **DB:** jalankan SQL revert 2A + 2C di atas (2B tidak perlu).

Rollback DB dan App **independen** — boleh salah satu saja. Mengembalikan presence ke
publication (2A) akan langsung menaikkan lagi Disk IO seperti semula.

---

## 5. Yang SENGAJA TIDAK diubah

- **`/api/auth/me` reconcile** (di `session-provider.tsx`) tetap jalan tiap load halaman. Ini sengaja **tidak** dimatikan karena itu yang memperbaiki bug "login Google nyangkut di mode preview". Biayanya kecil (1 request per hard-load).
- **Realtime untuk fitur sosial** (chat, DM, forum, support, notifikasi, voice, pinned, user_settings) tetap aktif — tidak diutak-atik.

---

## 6. Pemantauan & langkah lanjutan (kalau IO masih tinggi)

Pantau **Disk IO Budget** di dashboard Supabase 24–48 jam ke depan (refresh ~1 jam).
Kalau masih tinggi, lever berikutnya (BELUM dikerjakan):

1. Kurangi churn `realtime.subscription` (211rb ins/del) — gabungkan channel klien (support pakai banyak channel terpisah).
2. `ai_conversations`: berhenti menulis ulang seluruh kolom JSONB `messages` tiap giliran (187 MB WAL untuk 788 panggilan).
3. Naikkan interval polling sisa (mis. `use-online-users` 120s, red-dot admin).
4. Upgrade compute add-on Supabase (kalau memang trafik sudah melebihi tier Free).
