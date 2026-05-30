#!/usr/bin/env node
/**
 * Bans the em-dash (U+2014 "—") from user-facing source.
 *
 * Reason: the product voice uses "·" or "-" instead of em-dashes (Item 4 of the
 * polish batch). Em-dashes also read as "AI-generated". This guard keeps them
 * out of src/ and public/ once Phase 3 has cleaned the existing ones.
 *
 * Scope: scans .ts/.tsx/.js/.jsx/.json/.css/.html/.webmanifest under src/ and
 * public/. Skips .sql (migrations may contain prose with em-dashes in comments)
 * and binary assets. Exit 1 with file:line on any hit.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, extname, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const ROOTS = ["src", "public"].map((d) => resolve(root, d));

const SCAN_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".css", ".scss", ".html", ".webmanifest", ".md", ".txt",
]);
// Files/dirs we never scan.
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

const EM_DASH = "—";

const hits = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = extname(name).toLowerCase();
    if (ext === ".sql") continue;
    if (!SCAN_EXT.has(ext)) continue;
    const text = readFileSync(full, "utf8");
    if (!text.includes(EM_DASH)) continue;
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (line.includes(EM_DASH)) {
        hits.push(`${relative(root, full)}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}

for (const r of ROOTS) walk(r);

if (hits.length > 0) {
  console.error(`✗ Found ${hits.length} em-dash (—) occurrence(s). Use "·" or "-" instead:`);
  for (const h of hits) console.error(`    ${h}`);
  process.exit(1);
}

console.log("✓ No em-dashes in src/ or public/");
