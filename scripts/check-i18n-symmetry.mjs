#!/usr/bin/env node
/**
 * Asserts en.ts and id.ts expose the exact same set of translation keys.
 *
 * Reason: translate() falls back id -> key, so a key present in one locale but
 * missing in the other silently degrades UX (English user sees Indonesian, or
 * a raw key). This guard makes the asymmetry a build failure instead.
 *
 * Text-parses the `"key": "value"` lines (same rationale as validate-materi:
 * avoids tsx/ts-node just to read two dictionaries). Exit 1 on any mismatch.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = resolve(__dirname, "../src/lib/i18n");

// Matches a top-level entry:  "some.key": "...."   (key may contain . _ -)
const KEY_RE = /^\s*"([\w.\-]+)"\s*:/;

function extractKeys(file) {
  const text = readFileSync(resolve(i18nDir, file), "utf8");
  const keys = [];
  const dupes = new Set();
  const seen = new Set();
  for (const line of text.split("\n")) {
    const m = KEY_RE.exec(line);
    if (!m) continue;
    const key = m[1];
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
    keys.push(key);
  }
  return { set: seen, dupes };
}

const en = extractKeys("en.ts");
const id = extractKeys("id.ts");

const missingInId = [...en.set].filter((k) => !id.set.has(k)).sort();
const missingInEn = [...id.set].filter((k) => !en.set.has(k)).sort();

let failed = false;

if (en.dupes.size > 0) {
  console.error(`✗ Duplicate keys in en.ts: ${[...en.dupes].join(", ")}`);
  failed = true;
}
if (id.dupes.size > 0) {
  console.error(`✗ Duplicate keys in id.ts: ${[...id.dupes].join(", ")}`);
  failed = true;
}
if (missingInId.length > 0) {
  console.error(`✗ ${missingInId.length} key(s) in en.ts missing from id.ts:`);
  for (const k of missingInId) console.error(`    ${k}`);
  failed = true;
}
if (missingInEn.length > 0) {
  console.error(`✗ ${missingInEn.length} key(s) in id.ts missing from en.ts:`);
  for (const k of missingInEn) console.error(`    ${k}`);
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(`✓ i18n symmetry OK — ${en.set.size} keys in both locales`);
