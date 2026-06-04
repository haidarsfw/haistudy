-- Round-9: second share-proof slot (LE86 must share to 2 people).
-- Nullable + additive: backward-compatible, no backfill, safe to apply to a live DB.
alter table public.purchase_requests
  add column if not exists share_proof_path_2 text;
