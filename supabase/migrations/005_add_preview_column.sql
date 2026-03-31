-- Add is_preview column to license_keys
alter table license_keys add column if not exists is_preview boolean not null default false;

-- Mark PREVIEW01 as preview if it exists
update license_keys set is_preview = true where key = 'PREVIEW01';
