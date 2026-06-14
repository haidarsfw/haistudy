// One-off uploader for S2 UAS BM rangkuman slide figures.
//
// Extracts (done separately via `pdfimages`) are staged locally as
//   <root>/<subject>/<name>.png
// and uploaded to the public `slides` bucket at
//   s2-uas-bm/<subject>/<name>.png
// so they resolve at <SUPABASE_URL>/storage/v1/object/public/slides/s2-uas-bm/...
// and can be referenced from rangkuman via <slide src="s2-uas-bm/<subject>/<name>.png"/>.
//
// Usage: node scripts/upload-slides-uas.mjs [stagingRoot]   (default /tmp/slides-uas)
//
// Reads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
// from .env.local. The service role key bypasses RLS; this never touches the
// existing UTS images (different path prefix) and upserts so re-runs are safe.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.argv[2] || "/tmp/slides-uas";
const BUCKET = "slides";
const PREFIX = "s2-uas-bm";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const readEnv = (key) => {
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL") || readEnv("SUPABASE_URL");
const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.toLowerCase().endsWith(".png")) out.push(p);
  }
  return out;
}

const files = walk(ROOT).sort();
console.log(`Uploading ${files.length} file(s) from ${ROOT} to ${BUCKET}/${PREFIX}/...\n`);

let ok = 0;
let fail = 0;
for (const file of files) {
  const rel = relative(ROOT, file); // <subject>/<name>.png
  const dest = `${PREFIX}/${rel}`;
  const bytes = readFileSync(file);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(dest, bytes, { contentType: "image/png", upsert: true });
  if (error) {
    console.error(`FAIL  ${dest}  -> ${error.message}`);
    fail++;
  } else {
    console.log(`OK    ${dest}`);
    ok++;
  }
}

console.log(`\nDone. Uploaded ${ok}, failed ${fail}.`);
if (fail > 0) process.exit(1);
