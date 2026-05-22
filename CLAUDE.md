# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run build` | Production build — fails on TS errors |
| `npm run lint` | ESLint over `src/` |
| `npm run lint:data` | `scripts/validate-materi.mjs` — validates Drive IDs and shapes in `src/data/**` |
| `npx tsc --noEmit` | Fast type-check without emitting |

There is no test runner configured. The acceptance gate is `tsc --noEmit && next build`.

DB migrations live in `supabase/migrations/NNN_*.sql`. Apply via Supabase Dashboard, the Supabase CLI, or the MCP `apply_migration` tool — never edit a migration after it has been applied to a remote project.

## Architecture overview

### Multi-scope namespace

The whole app is structured around a `(semester, exam_period, jurusan)` tuple — the "scope". `s2/uas/bm` ⇒ Semester 2, UAS, Business Management. Every cohort-shared row (chat, forum, support, announcements, AI conversations, presence, notifications, voice rooms, license keys) carries `semester int + exam_period text + jurusan text` columns. URL pattern: `/s{N}/{uts|uas}/{jurusan}/...`. Two users on the same `(semester, exam_period, jurusan)` tuple share the same chat room — junior cohorts inherit history from earlier years automatically.

Scope flow on every request:

```
Login → /api/auth/validate looks up license_keys row → sets cookies:
  hs-session, hs-admin (if admin), hs-scope = "s2-uts-bm"
  ↓
src/proxy.ts (Next 16 renamed middleware → proxy)
  - Public paths pass
  - No hs-session → /login
  - Unscoped legacy paths (/dashboard, /subject, /jadwal-uts...) → 308
    redirect into /s{N}/{exam}/{jur}/{path} using hs-scope cookie
  - jadwal-uts → jadwal (renamed in scoped tree)
  ↓
src/app/(scoped)/[semester]/[exam]/[jurusan]/layout.tsx
  - parseScopePath → notFound() if scope not in AVAILABLE_SCOPES
  - mounts <ScopeProvider><ScopedDataProvider><AppShell>
  ↓
useScope() / useOptionalScope() — read by:
  - Sidebar, MobileNav, Header (scope-aware hrefs + scope badge)
  - subject/[id], jadwal, bookmarks pages — load content for current scope
  - Every Realtime hook (channel name + filter)
  - Every API call (server validates scope match)
```

### Critical files — what they own

| File | Role |
|---|---|
| `src/types/scope.ts` | `ScopeTuple`, `ScopeKey`, `ScopePath`, `ExamPeriod` |
| `src/lib/scope.ts` | Parse/serialize/validate. `AVAILABLE_SCOPES`, `ALLOWED_JURUSAN`, `DEFAULT_SCOPE`, `scopeKey()`, `scopePath()`, `parseScopeKey()`, `parseScopePath()`, `eqScope()`, `isAvailableScope()` |
| `src/lib/auth/scope-check.ts` | `requireScope(req)`, `scopeEq(scope)`, `scopeColumns(scope)`, `ScopeError`. **Every API route handler must call `await requireScope(req)`** — service_role bypasses RLS so this is the only cross-scope leak guard |
| `src/lib/license/generator.ts` | 5-char keys (alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, excludes `0/O/1/I/L`). `isAcceptableKeyFormat()` accepts both 5-char new format and 12-char legacy `XXX-XXX-XXX` |
| `src/lib/auth/server-rate-limit.ts` | `/api/auth/validate` brute-force defense. Backed by `scope_login_attempts` table. 10/5min, 50/1h, 200/24h |
| `src/lib/realtime/channels.ts` | All channel names. Format `<scope-key>:<surface>[:<id>]`, e.g. `s2-uas-bm:chat:global`, `s2-uas-bm:support:msgs:H7K49`. Always pair with `scopeRealtimeFilter(scope)` |
| `src/proxy.ts` | URL routing. **Not** `middleware.ts` — Next 16 renamed it |
| `src/data/index.ts` | `AVAILABLE_SCOPES` manifest + static loader map. Use `loadCourses(scope)`, `loadContent(scope, id)`, `loadSchedule(scope)`, `loadRangkuman(scope, id)`, `loadPinnedThreads(scope, id)` |
| `src/data/{subjects,content,schedules,rangkuman,pinned-threads}.ts` | Thin compat shims re-exporting from `s2/uts/bm/*`. Legacy callsites still work for default scope; new code uses `loadX(scope)` from `src/data/index.ts` |
| `src/components/providers/scope-provider.tsx` | `useScope()` / `useOptionalScope()` hooks. Mounts inside `(scoped)` layout |
| `src/components/providers/scoped-data-provider.tsx` | `useScopedData()` — pre-loaded courses/content/schedule for current scope. Dashboard widgets consume this synchronously |

### Auth model

License-key auth, not Supabase Auth. Each license key in `license_keys` has `(semester, exam_period, jurusan)` columns bound at admin creation time. Validation flow in `src/app/api/auth/validate/route.ts`:

1. IP rate-limit pre-flight (`checkServerRateLimit`)
2. Accept dual format: `isAcceptableKeyFormat` (5-char new, legacy `XXX-XXX-XXX`, mock `ADMIN1`/`PREVIEW01`)
3. Lookup license_keys → check `suspended_until`, `fixed_expiry`
4. Find or create activation; new activations expire at `now() + 30d`
5. Device limit check (`max_devices` or `unlimited_devices`)
6. Settings upsert (parallel)
7. Set `hs-session`, `hs-admin`, `hs-scope` httpOnly cookies
8. `recordLoginAttempt(ip, "ok" | "fail")` for the rate limiter

`hs-scope` is the source of truth for server-side scope on every API call. It's read by `requireScope()` from `next/headers` cookies.

### Data layer

Content is in-repo TypeScript, not the DB:

```
src/data/
  index.ts                    # AVAILABLE_SCOPES + static loader map
  s2/
    uts/bm/
      courses.ts              # Subject[]
      content.ts              # Record<subjectId, SubjectContent>
      schedule.ts             # weeklySchedule, examSchedule
      rangkuman.ts            # Record<subjectId, Record<moduleKey, html>>
      pinned-threads.ts       # Record<subjectId, ForumThread[]>
      {subject}-m{N}.ts       # per-module materi/rangkuman modules
      {subject}-flashcards.ts
      {subject}-quiz.ts
    uas/bm/                   # mirror, fill in as content is authored
  {subjects,content,schedules,rangkuman,pinned-threads}.ts  # compat shims
```

Loader map in `src/data/index.ts` uses static `import()` calls per scope-key so Turbopack/webpack can tree-shake per-scope chunks (template-string dynamic imports often defeat code-splitting). Add a new scope = add entry to `AVAILABLE_SCOPES` + `loaders` + create the folder.

### API route pattern

Every handler:

```ts
export async function POST(req: Request) {
  try {
    const scope = await requireScope(req);  // throws ScopeError if no/wrong scope cookie
    // ...auth/admin checks...

    const supabase = createServerClient()!;
    // SELECT — apply scope filter
    const { data, error } = await scopeEq(scope)(
      supabase.from("foo").select("*").eq("license_key", lk)
    );
    // INSERT — denormalize scope
    await supabase.from("foo").insert({ ...payload, ...scopeColumns(scope) });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    // ...
  }
}
```

`scopeEq` is intentionally untyped (`any`) — the type constraint clashes with `.single()`/`.maybeSingle()` thenable shapes. Callers stay typed via Supabase inference on chained methods after the wrapper.

### Realtime convention

Channel name = `<scope-key>:<surface>:<id>`. Always include `filter: scopeRealtimeFilter(scope)` (filters on `semester` since Realtime postgres_changes only supports one column filter) and then **cross-check `exam_period` + `jurusan` from `payload.new` client-side**:

```ts
.on("postgres_changes", { ..., filter: scopeRealtimeFilter(scope) }, (payload) => {
  if (payload.new.exam_period !== scope.examPeriod || payload.new.jurusan !== scope.jurusan) return;
  // ...handle
})
```

### Routing

- `src/app/(landing)/` — public marketing, login, preview, privacy, terms
- `src/app/(scoped)/[semester]/[exam]/[jurusan]/` — the authenticated app shell. Pages inside use `useScope()` to compose hrefs (`${base}/dashboard`, `${base}/subject/${id}`, etc.)
- `src/app/admin/` — admin shell + `materi-audit/`. Admin scope dropdown in `src/components/admin/admin-scope-switcher.tsx`

Note: `src/proxy.ts` redirects legacy unscoped URLs (`/dashboard`, `/subject/...`, `/jadwal-uts`) to the user's scoped tree using `hs-scope` cookie. Most internal links should be scope-aware via `useScope()`; the proxy is a safety net.

### Feature flags

Two systems coexist:

1. **`src/lib/feature-flags.ts`** — currently authoritative. Global booleans (`AI_ENABLED`, `VOICE_ENABLED`) consumed by `ai-chat-panel.tsx`, `voice-panel.tsx`, `/api/ai/chat`, `/api/voice/{token,rooms}`.
2. **`scope_feature_flags` table** — seeded in migration 022 with per-scope rows (`(2,'uts','bm','ai_chat',false,...)` etc.) and added to the Realtime publication, but no runtime consumer yet. Reserved for future per-scope toggling without redeploy.

### Common pitfalls

- **Don't create `src/middleware.ts`** — Next 16 ignores it. Edit `src/proxy.ts`.
- **Don't bypass `requireScope`** in API routes. Service_role bypasses RLS, so without `requireScope` a single forgotten handler leaks cross-scope data.
- **Don't widen `ALLOWED_JURUSAN` without seeding `scope_feature_flags`** for the new tuple — `parseScopePath` will accept it but feature flags will be missing.
- **License keys are uppercased** before lookup. Validator accepts the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` plus legacy `[A-Z0-9-]{6,16}` with a dash. Don't add lowercase or full ASCII.
- **Migration 022 left column DEFAULTs** on `(semester, exam_period, jurusan)` deliberately — they're safety nets for forgotten INSERTs. Drop only after 7 days of clean production logs via a separate migration.
- **`vercel.json` crons hit a 2-job ceiling on Hobby.** Currently full: `cleanup-presence` (weekly) + `notify-email` (every minute). Consolidate before adding more.
- **`user_settings.progress` and `user_settings.notes` are JSONB nested under scope-key** (`progress["s2-uts-bm"]["statistik"] = {...}`). Migration 022 already rewrote existing rows; client read/write code must follow the nested shape.

### Supabase project

Project: `haistudy` (`gvjwxccwuyuhgexypgbn`, ap-southeast-1, Postgres 17). RLS uses `USING (true)` SELECT policies for tables that Realtime broadcasts; writes flow through the service_role key in API routes. Anon-side scope isolation is enforced by client filtering, not RLS — accepted threat model since anon key was always public.
