// Shared UUID validity check. Used to guard DB queries whose column is `uuid`
// against non-uuid ids (e.g. pinned/static forum threads carry string ids like
// "pinned-akuntansi-uas-modul-v1"); passing those to a uuid column throws
// Postgres 22P02 "invalid input syntax for type uuid".
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
