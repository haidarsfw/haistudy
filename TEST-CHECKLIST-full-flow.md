# Test Checklist — Full Single Flow (Batch 1 + Batch 2)

One continuous walkthrough, top to bottom. No backtracking — each area is visited once.
Tick as you go; note anything ❌ with what you saw.

**Before start**
- Log in to **s2 / UAS / BM** on desktop (repeat key spots on mobile 📱 where noted).
- Have a **second account** ready (another browser/device) for chat/DM/presence.
- Dev only: `?examMins=1` on a Latihan Soal URL forces a 1-min timer.

---

## 1. Dashboard landing
- [ ] Online widget shows **yourself** within ~2s (no refresh).
- [ ] Log in the 2nd account elsewhere → it **appears** in your online list live; log it out → **disappears** shortly.
- [ ] If the online list is **empty/stuck** → note it (fallback should still fill it within ~2 min).
- [ ] Music: open player, press **Play** → starts on first try; **track title** shows + changes per track; next/prev/shuffle/loop OK.

## 2. Profile photo (do both entry points here, once)
- [ ] Bottom-left **sidebar profile** → change photo → **cropper opens**; **drag the image to pan** (not just zoom); zoom slider works; Apply saves.
- [ ] Underlying panel stayed open while cropping (didn't close behind).
- [ ] Settings → Profile → change photo → same cropper + pan works.
- [ ] New photo now shows on your dashboard + sidebar.

## 3. Chat + DM (use both accounts)
- [ ] Open chat → **DM tab** → **+ new chat**: users with a photo show their **photo** in the picker (not just initials).
- [ ] Start a DM to account B; from B, reply.
- [ ] On A (chat panel closed): **red dot/count on the chat icon**.
- [ ] Open chat: the **DM tab shows a red dot**; Global/VIP tabs show their own dots when they have unread.
- [ ] Open the DM thread → dot clears. Photos show on bubbles + DM list.
- [ ] (If push enabled) close the tab, send a DM from B → **web-push** arrives.

## 4. Subject page — tabs + Belajar Kilat
Open any **s2/UAS/BM** subject.
- [ ] Tab bar shows **"Hafalan & Kuis"** (no separate Flashcards/Quiz tabs); the in-tab toggle switches Flashcards ↔ Quiz, both work.
- [ ] 📱 desktop tab bar fits cleanly.
- [ ] Open **Belajar Kilat**, finish the whole feed to **100%** (complete screen).
- [ ] Reopen Kilat → table of contents → you can now **jump to ANY chapter** freely (nothing locked).

## 5. Latihan Soal — full attempt (one sitting)
Open a subject with Latihan Soal (e.g. **Ops Mgmt**).
- [ ] Start exam → immersive full-screen.
- [ ] Open **scratchpad**: draw; switch to **Dock** → exam content **shifts** (not covered); usage tip shows, dismiss it (✕) → stays gone on reopen today; clear button reads **"Bersihkan"**.
- [ ] Open **calculator** (Ops/Accounting) → works.
- [ ] Open **cheat sheet** → **Web** view readable (formulas not stacked); **PDF** view pager reads **"Lembar 1/5"** (not web tab names).
- [ ] Answer **every** question, **Kumpulkan**.
- [ ] Grading finishes → **every unit scored**, none say "Soal tidak dinilai oleh AI". ⭐
- [ ] Results: click a unit chip (1a/1b…) → **scrolls to that pembahasan**; filter **Salah/Sebagian** works.
- [ ] Tap **"Nilai Ulang (AI)"** → re-grades in place.

## 6. Latihan Soal — timer + resume (second attempt, `?examMins=1`)
Reload the launch page with `?examMins=1`, start a new attempt.
- [ ] Type a couple answers. Press browser **Back** → does NOT leave; exit-confirm modal. **Esc** → same.
- [ ] **Refresh** the page mid-exam → launch button now reads **"Lanjut Mengerjakan Soal"**; continue → answers intact, timer kept running, no extra quota used.
- [ ] 📱 switch apps/tabs >2s, return.
- [ ] Let the 1-min timer **hit 0** → auto-submits **once**, grades, shows results (no loop/spinner/404); your answers are in the review; note shows "kamu meninggalkan ujian N kali" if you switched away. ⭐

## 7. Admin (admin account)
- [ ] License keys: **search by nickname/username** → finds the user (not just by key/name). ⭐
- [ ] Edit a license → set/change **Nickname** → save → re-open: nickname persisted.
- [ ] Purchase orders: search by **nickname** → finds the order.
- [ ] Open a user's **detail** → **Latihan Soal** section lists subjects with attempts + best/last %.

---

## Notes / known
- **Presence (1)** + **web-push (3)** depend on prod Realtime/push being authorized — verify live; fallback poll covers an empty presence list.
- `play.google.com/log … ERR_BLOCKED_BY_CLIENT` in console = the **Google Drive/Slides material viewer**'s own telemetry blocked by your adblocker. Third-party, harmless, not fixable from our side — ignore.
- Online-list pfp-next-to-name was adjusted in your own recent dashboard commits; this checklist doesn't re-assert that specific row.

## Sign-off
- [ ] All ✅ → safe to push live.
- [ ] ❌ list → send me; I fix before push.
