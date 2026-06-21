# Test Checklist — Batch 1 (Exam) + Batch 2 (Platform)

Branch `feat/latihan-soal-platform`. Gate: `npx tsc --noEmit && npm run build` (both green).
Tick each box. Note FAIL items with what you saw → I'll fix before live push.

**Setup**
- `npm run dev`, log in to **s2 / UAS / BM** (the scope most changes target).
- Dev-only helper: append `?examMins=1` to a Latihan Soal URL to force a 1-minute timer (expiry/auto-submit test). Only works in dev.
- Test on **desktop AND mobile** (or devtools responsive) where noted 📱.

---

## BATCH 1 — Exam (Latihan Soal)

### 1.1 ⭐ Grading completeness (#2)
- [ ] Open **Ops Mgmt** Latihan Soal, answer ALL units, submit.
- [ ] Every unit gets a score — **none** say "Soal tidak dinilai oleh AI" (was: only first ~3 graded).
- [ ] Repeat for **Accounting** and **Foundations of AI** — all units graded.

### 1.2 Re-grade on results screen (#1)
- [ ] After submit, results screen shows **"Nilai Ulang (AI)"** button.
- [ ] Click it → shows grading loader → returns updated scores in place (no page leave).
- [ ] Re-grade also still works from **Riwayat**.

### 1.3 ⭐ Auto-submit on expiry — no loop, no lost answers (#4)
- [ ] Open exam with `?examMins=1`, answer a few, **let timer hit 0**.
- [ ] Auto-submits **once**, grades, shows results. No infinite spinner / no repeated submits / no 404.
- [ ] Answers you typed are present in the review (not blank).

### 1.4 Resume + anti-exploit (#6)
- [ ] Start an exam, answer some, **refresh the page** mid-exam.
- [ ] Launch screen button now reads **"Lanjut Mengerjakan Soal"** (not "Mulai").
- [ ] Continue → same attempt, answers intact, **timer kept counting** during the time away (wall-clock).
- [ ] Resuming did **not** consume a new quota.
- [ ] 📱 Switch to another tab/app for >2s during the exam, come back, submit → results show "kamu meninggalkan ujian N kali".

### 1.5 Back/Esc trapped during exam (#7)
- [ ] Mid-exam, press browser **Back** → does NOT leave; shows the exit-confirm modal.
- [ ] Press **Esc** → shows exit-confirm modal (doesn't crash out).
- [ ] Notifications/toasts still appear normally (not blocked).

### 1.6 Tips dismiss-for-the-day (#5)
- [ ] Open scratchpad → tip banner visible; click its **✕**.
- [ ] Close + reopen scratchpad (same day) → tip stays hidden.
- [ ] Same for the cheat-sheet web-view intro tip.

### 1.7 Scratchpad dock shifts content (#9)
- [ ] Open scratchpad, switch to **Dock** mode (desktop).
- [ ] Exam content **shifts left** so the question is fully readable (not covered by the pad).
- [ ] Float + Fullscreen modes still work; drawing works (finger/mouse/stylus).
- [ ] 📱 Mobile: scratchpad usable (bottom dock).

### 1.8 Scratchpad clear button (#8)
- [ ] Scratchpad → clear → confirm dialog button reads **"Bersihkan"** (not "Bersihkan halaman").

### 1.9 Pembahasan TOC + jump + filter (#3)
- [ ] On results, the per-unit score chips (1a, 1b, …) are **clickable** → scroll to that question's review.
- [ ] Review section has a sticky **filter**: Semua / Salah / Sebagian — filters the list.
- [ ] Status dots match scores (green/amber/red).

### 1.10 Cheat sheet (#10)
- [ ] Ops Mgmt exam → cheat sheet → **PDF view**: pager reads **"Lembar 1/5"** with prev/next (NOT the web section names).
- [ ] **Web view**: formulas spaced out (not stacked/cramped), readable.

---

## BATCH 2 — Platform

### 2.1 Profile pictures everywhere (#23, #13)
- [ ] Chat → DM → **+ (new chat)** picker: users who set a photo show their **photo** (not just initials).
- [ ] Dashboard online widget → **"Lihat Semuanya"**: each row shows the user's **pfp left of the name**.
- [ ] Chat bubbles + DM list + dashboard online card still show photos.

### 2.2 Avatar crop (#11)
- [ ] Settings → Profile → change photo → in the cropper, **drag the image** around (pan), not only zoom. ⭐ (was broken)
- [ ] Click the **dashboard bottom-left profile** (sidebar) → change photo → the **cropper opens** (was a raw upload before).
- [ ] While cropping, the underlying settings/profile panel **stays open** (doesn't close behind).
- [ ] Apply → new photo saves + appears across the app.

### 2.3 ⭐ Online presence — realtime (#18)
- [ ] Open the app → dashboard online list shows **yourself** within a second or two.
- [ ] Second device/browser (another account) logs in → appears in your list **without refresh**; logs out/closes → disappears shortly.
- [ ] (Optional) DevTools → Network: no repeating `/presence`-style poll every ~2 min for the live list.
- [ ] ⚠️ If the online list stays **empty** → tell me (Realtime channel auth issue; I have a fallback ready).

### 2.4 DM notifications (#21)
- [ ] From account B, send a DM to account A. On account A (app open, panel closed): chat icon shows a **red dot/count**.
- [ ] Open chat → the **DM tab** shows a red dot (source indicator); Global/VIP tabs show their own dots when they have unread.
- [ ] Open the DM thread → dots clear.
- [ ] (If you enabled push) with the app/tab closed, a new DM triggers a **web-push** notification.

### 2.5 Music (#17)
- [ ] Open music player, press **Play** the first time → it **starts** (no need to re-enter a link or reset to lofi). ⭐
- [ ] **Track title** shows + updates as tracks change.
- [ ] Next/Prev/Shuffle/Loop work; pasting a custom SoundCloud link works; reset to lofi works.

### 2.6 Merged "Hafalan & Kuis" tab (#19)
- [ ] In **s2/UAS/BM** subject: tabs show **"Hafalan & Kuis"** (no separate Flashcards/Quiz tabs).
- [ ] Inside it, the **Flashcards / Quiz** sub-toggle switches between the two; both work + save progress/score.
- [ ] Open an **earlier scope** (e.g. s2/UTS or s1) subject → Flashcards + Quiz remain **separate** tabs (unchanged).
- [ ] Deep-link `?tab=3` or `?tab=4` in s2/UAS/BM → lands on the merged tab (no dead panel).

---

## Known watch-points
- **Presence (2.3)** + **DM web-push (2.4)** depend on Supabase Realtime / push subscription being authorized in production — verify live; report if empty/missing.
- **DM in-app notifications**: the core fix (mig 049) is already live on prod since 2026-06-19, so these should already work; this batch only added the tab source-dots.
- `exam_attempts` table already exists on prod → exam history/quota persist.

## Sign-off
- [ ] All ✅ → safe to push to live.
- [ ] Any ❌ → list them; I fix before push.

Still pending in Batch 2 (NOT in this build, will do after your test): kilat unlock-all-after-completion, admin nickname search/edit, admin lightweight exam summary, `play.google` console-error investigation.
