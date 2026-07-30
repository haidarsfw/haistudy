#!/usr/bin/env node
/**
 * Route snapshot — the "was it already broken?" tool.
 *
 *   node scripts/route-snapshot.mjs > snapshots/before.json
 *   ... make changes ...
 *   node scripts/route-snapshot.mjs > snapshots/after.json
 *   node scripts/route-snapshot.mjs --compare snapshots/before.json
 *
 * Walks src/app, finds every page and API route, and records what each one
 * answers to an unauthenticated GET against a running dev server. The point is
 * not that the answers are interesting — most are 307 or 401 — but that they are
 * STABLE. A route that answered 401 yesterday and 500 today did not become
 * broken by coincidence, and one that answered 500 both times was broken before
 * anyone touched it.
 *
 * That distinction is the whole tool. Without a recorded "before", every bug
 * found during testing is a matter of opinion about whose change caused it.
 *
 * Signed out on purpose. A snapshot that needs a live session would depend on
 * that session's own state, which is exactly the thing under change here.
 *
 * GET only, and never anything that acts. The skip list below is not an
 * optimisation — those routes do work when you merely open them.
 */

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const BASE = process.env.SNAPSHOT_BASE ?? "http://localhost:3000";
const APP_DIR = join(process.cwd(), "src", "app");

/**
 * Routes that CHANGE something when opened, so they must never be probed.
 * Each entry is a reason, not a preference.
 */
const SKIP = [
  "/enter", // activates a licence and sets the app cookies
  "/auth/callback", // consumes a one-time OAuth code
  "/clearcookies", // wipes the caller's session
  "/api/cron/", // mutates presence rows and purges accounts
  "/logout", // ends the session
  "/api/account/logout",
];

/** Stand-ins for dynamic segments. Never a real id — probing must not resolve. */
const PROBE = "__snapshot_probe__";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (name === "page.tsx" || name === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

/** src/app/(landing)/account/access/page.tsx  ->  /account/access */
function toUrlPath(file) {
  const rel = relative(APP_DIR, file).split(sep);
  rel.pop(); // page.tsx | route.ts
  const parts = [];
  for (const seg of rel) {
    if (seg.startsWith("(") && seg.endsWith(")")) continue; // route group
    if (seg.startsWith("@")) return null; // parallel route slot
    if (seg.startsWith("[")) {
      parts.push(PROBE);
      continue;
    }
    parts.push(seg);
  }
  return "/" + parts.join("/");
}

/** Does this route file even export a GET? A POST-only route has no answer. */
function hasGet(file) {
  if (file.endsWith("page.tsx")) return true;
  const src = readFileSync(file, "utf8");
  return /export\s+(async\s+)?function\s+GET\b/.test(src) || /export\s+const\s+GET\b/.test(src);
}

async function probe(path) {
  const started = Date.now();
  try {
    const res = await fetch(BASE + path, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "haistudy-route-snapshot" },
    });

    const entry = {
      status: res.status,
      // Where a redirect points matters as much as the fact of one: /login and
      // /unavailable are both 307 and mean opposite things.
      location: res.headers.get("location") ?? null,
      type: (res.headers.get("content-type") ?? "").split(";")[0] || null,
    };

    // For JSON, keep the shape and the error code, never the body. Bodies carry
    // timestamps and ids that would make every snapshot differ from every other
    // one and drown the real changes.
    if (entry.type === "application/json") {
      try {
        const body = await res.json();
        entry.keys = Object.keys(body ?? {}).sort();
        if (typeof body?.code === "string") entry.code = body.code;
        if (typeof body?.error === "string") entry.hasError = true;
      } catch {
        entry.keys = ["<unparseable>"];
      }
    }

    entry.slowMs = Date.now() - started > 3000 ? Date.now() - started : undefined;
    return entry;
  } catch (err) {
    return { status: 0, unreachable: String(err?.cause?.code ?? err?.message ?? err) };
  }
}

async function main() {
  const compareTo = process.argv.includes("--compare")
    ? process.argv[process.argv.indexOf("--compare") + 1]
    : null;

  const files = walk(APP_DIR).filter(hasGet);
  const paths = [...new Set(files.map(toUrlPath).filter(Boolean))]
    .filter((p) => !SKIP.some((s) => p.startsWith(s)))
    .sort();

  // Sequential on purpose. A dev server compiling twenty routes at once reports
  // timeouts that say nothing about the routes themselves.
  const result = {};
  for (const p of paths) {
    result[p] = await probe(p);
  }

  const unreachable = Object.values(result).filter((r) => r.status === 0).length;
  if (unreachable === paths.length) {
    console.error(
      `\nNothing answered at ${BASE}. Start the dev server first: npm run dev\n`
    );
    process.exit(2);
  }

  if (!compareTo) {
    process.stdout.write(JSON.stringify({ base: BASE, routes: result }, null, 2) + "\n");
    console.error(`\n${paths.length} routes probed, ${unreachable} unreachable.\n`);
    return;
  }

  const before = JSON.parse(readFileSync(compareTo, "utf8")).routes ?? {};
  const changed = [];
  const gone = [];
  const added = [];

  for (const [path, now] of Object.entries(result)) {
    const then = before[path];
    if (!then) {
      added.push(path);
      continue;
    }
    // slowMs is timing noise, not behaviour.
    const strip = ({ slowMs, ...rest }) => JSON.stringify(rest);
    if (strip(then) !== strip(now)) changed.push({ path, before: then, after: now });
  }
  for (const path of Object.keys(before)) {
    if (!result[path]) gone.push(path);
  }

  if (!changed.length && !gone.length && !added.length) {
    console.log(`No route changed its answer. ${paths.length} routes compared.`);
    return;
  }

  if (changed.length) {
    console.log(`\nCHANGED (${changed.length}) — these are the ones to explain:\n`);
    for (const c of changed) {
      console.log(`  ${c.path}`);
      console.log(`    before: ${JSON.stringify(c.before)}`);
      console.log(`    after:  ${JSON.stringify(c.after)}`);
    }
  }
  if (added.length) console.log(`\nNEW (${added.length}):\n  ${added.join("\n  ")}`);
  if (gone.length) console.log(`\nREMOVED (${gone.length}):\n  ${gone.join("\n  ")}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
