#!/usr/bin/env node
// Lightweight off-Supabase backup of haistudy's critical tables to a local,
// timestamped JSON file.
//
//   node --env-file=.env.local scripts/backup-critical.mjs
//
// Zero free-tier cost (a handful of one-off SELECTs via the service role, run
// on-demand from your machine — cron it locally if you want a schedule). This
// is a portable safety net, NOT full disaster recovery: real DR arrives with
// the Semester-3 VPS move. Output lives in ./backups (gitignored — it contains
// PII, never commit it to the public repo).

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=.env.local scripts/backup-critical.mjs"
  );
  process.exit(1);
}

// Irreplaceable business data + core user state. Ephemeral / regenerable tables
// (chat, forum, support, dm, notifications, presence) are intentionally excluded
// to keep the dump lean and PII-focused.
const TABLES = [
  "license_keys",
  "activations",
  "devices",
  "purchase_requests",
  "oauth_links",
  "referrals",
  "user_settings",
  "user_profiles",
  "exam_attempts",
];

const supabase = createClient(url, key, { auth: { persistSession: false } });

const dump = { takenAt: new Date().toISOString(), tables: {} };
let total = 0;
for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error(`  x ${table}: ${error.message}`);
    dump.tables[table] = { error: error.message };
    continue;
  }
  dump.tables[table] = data;
  total += data.length;
  console.log(`  ok ${table}: ${data.length} rows`);
}

const dir = path.join(process.cwd(), "backups");
await mkdir(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = path.join(dir, `haistudy-backup-${stamp}.json`);
await writeFile(file, JSON.stringify(dump, null, 2), "utf8");
console.log(
  `\nBackup written: ${file}\n(${total} rows across ${TABLES.length} tables)`
);
