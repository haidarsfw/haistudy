// ============================================
// Admin fetch helper
// ============================================
// Admin data reads go through service_role API routes guarded by validateAdmin.
// Those return 403 when the admin session cookie is missing/expired. Components
// used to do `data.x || []`, which turned a 403 into a SILENT empty panel (the
// "admin kosong di prod" bug: the localStorage session still rendered the shell,
// but every fetch 403'd and showed nothing). adminFetch makes that loud: it
// throws so the caller can render an actionable error instead of a blank list.

export class AdminAuthError extends Error {
  status: number;
  constructor(status: number) {
    super("admin-auth");
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export class AdminFetchError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message || "admin-fetch");
    this.name = "AdminFetchError";
    this.status = status;
  }
}

/** Fetch JSON from an admin API route. Throws on non-OK (auth vs other). */
export async function adminFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401 || res.status === 403) throw new AdminAuthError(res.status);
  if (!res.ok) throw new AdminFetchError(res.status);
  return (await res.json()) as T;
}

/** Human message for an admin fetch failure (Indonesian, matches app tone). */
export function adminErrorMessage(e: unknown): string {
  if (e instanceof AdminAuthError) {
    return "Sesi admin berakhir atau tidak punya akses. Silakan login ulang.";
  }
  if (e instanceof AdminFetchError) {
    return "Gagal memuat data dari server. Coba lagi.";
  }
  return "Gagal memuat data. Periksa koneksi lalu coba lagi.";
}
