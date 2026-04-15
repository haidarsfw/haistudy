#!/usr/bin/env node
/**
 * Build-time sanity check for src/data/content.ts materi arrays.
 *
 * Reason for a regex parser (rather than importing the module):
 *   content.ts imports from "@/..." aliases and uses TypeScript syntax. Running
 *   it from a plain Node script would need tsx/ts-node + tsconfig-paths as new
 *   devDeps. The materi shape is stable enough that text-parsing is cheaper.
 *
 * What we check per subject (statistik, biseko, cbkwn, akuntansi, foundai):
 *   - materi[].id values are unique
 *   - materi[].driveId values are unique (duplicate → wrong card → wrong slide)
 *   - no placeholder / empty driveIds
 *   - driveIds look like plausible Google Drive IDs (≥20 chars, [\w-])
 *
 * Exit code 1 on any failure, 0 on success. Wire into CI via `npm run lint:data`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentPath = resolve(__dirname, "../src/data/content.ts");
const text = readFileSync(contentPath, "utf8");

// Split into subject blocks. Each subject starts at "  <key>: {" (indent=2).
// We match the key then find the matching closing "  }," at the same indent.
function extractSubjectBlocks(source) {
  const blocks = {};
  const headerRe = /^  (\w+): \{$/gm;
  let match;
  while ((match = headerRe.exec(source)) !== null) {
    const key = match[1];
    const bodyStart = match.index + match[0].length;
    // Find matching "\n  }," — the next line at indent 2 ending the block
    const closeRe = /\n  \},?$/gm;
    closeRe.lastIndex = bodyStart;
    const closeMatch = closeRe.exec(source);
    if (!closeMatch) continue;
    blocks[key] = source.slice(bodyStart, closeMatch.index);
  }
  return blocks;
}

function extractMateriArray(subjectBody) {
  // Match "materi: [" up to its closing "]," (greedy across newlines).
  // Nested arrays inside materi (kisiKisi, flashcards) come LATER, so a simple
  // non-greedy match to the first "\n    ],\n" at 4-space indent works.
  const m = subjectBody.match(/materi:\s*\[([\s\S]*?)\n    \],?\n/);
  return m ? m[1] : null;
}

function extractEntries(materiBody) {
  // Each entry: `      { id: N, title: "...", driveId: "...", ... },`
  // Pull id + driveId values per line.
  const entries = [];
  const lineRe = /\{\s*id:\s*(\d+)[^}]*?driveId:\s*["']([^"']*)["'][^}]*?\}/g;
  let m;
  while ((m = lineRe.exec(materiBody)) !== null) {
    entries.push({ id: Number(m[1]), driveId: m[2] });
  }
  return entries;
}

function validateSubject(subjectKey, entries) {
  const errors = [];
  const seenIds = new Map();
  const seenDriveIds = new Map();

  for (const { id, driveId } of entries) {
    if (seenIds.has(id)) {
      errors.push(
        `${subjectKey}: duplicate materi id ${id} (also at driveId ${seenIds.get(id)})`
      );
    }
    seenIds.set(id, driveId);

    if (!driveId || driveId === "PLACEHOLDER") {
      errors.push(`${subjectKey}: materi id ${id} has placeholder/empty driveId`);
      continue;
    }
    if (driveId.length < 20) {
      errors.push(
        `${subjectKey}: materi id ${id} driveId "${driveId}" looks too short`
      );
    }
    if (!/^[\w-]+$/.test(driveId)) {
      errors.push(
        `${subjectKey}: materi id ${id} driveId "${driveId}" has invalid chars`
      );
    }
    if (seenDriveIds.has(driveId)) {
      errors.push(
        `${subjectKey}: driveId "${driveId}" used by both id ${seenDriveIds.get(driveId)} and id ${id}`
      );
    }
    seenDriveIds.set(driveId, id);
  }

  return errors;
}

const blocks = extractSubjectBlocks(text);
const subjectKeys = Object.keys(blocks);

if (subjectKeys.length === 0) {
  console.error("❌ No subject blocks found — parser may be broken.");
  process.exit(1);
}

const allErrors = [];
let totalEntries = 0;

for (const key of subjectKeys) {
  const materiBody = extractMateriArray(blocks[key]);
  if (materiBody === null) {
    console.log(`  ${key}: no materi[] (skipped)`);
    continue;
  }
  const entries = extractEntries(materiBody);
  totalEntries += entries.length;
  const errors = validateSubject(key, entries);
  if (errors.length === 0) {
    console.log(`  ${key}: ${entries.length} materi OK`);
  } else {
    allErrors.push(...errors);
  }
}

if (allErrors.length > 0) {
  console.error(`\n❌ Materi validation failed (${allErrors.length} issues):\n`);
  for (const e of allErrors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `\n✅ Materi validation passed: ${totalEntries} entries across ${subjectKeys.length} subjects.`
);
