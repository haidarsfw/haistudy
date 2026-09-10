/**
 * What /account shows while the next pane is being fetched.
 *
 * Every pane here is a server component that reads the database, which measured
 * at 109-326ms per switch on a healthy connection. Without this file React had
 * nothing to show during that wait, so it kept the OLD pane on screen, frozen,
 * and swapped it only when the new one was ready. Clicking therefore did
 * nothing at all for a fifth of a second and then everything at once — the
 * "delay" and the "flicker" reported on 2026-08-12 were one and the same thing.
 *
 * A skeleton is not decoration here. It is the only thing that answers the
 * click, and it answers immediately: Next can serve this boundary from a
 * prefetch, before the database has been touched.
 *
 * The nav is deliberately NOT drawn. It lives in the layout, so it is already
 * on screen and must not be replaced by a grey copy of itself.
 */
export default function AccountPaneLoading() {
  return (
    <div className="gap-12 lg:grid lg:grid-cols-[12rem_1fr]">
      {/* Kolom kiri dikosongkan, bukan diisi rangka: navigasinya sudah nyata
          dan sudah terlihat. Menggambar rangka di atasnya justru membuat menu
          yang baik-baik saja terlihat ikut dimuat ulang. */}
      <div aria-hidden className="hidden lg:block" />

      <div className="min-w-0" aria-busy="true" aria-live="polite">
        <span className="sr-only">Memuat…</span>

        <div className="h-7 w-40 animate-pulse rounded-md bg-foreground/8" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-foreground/5" />

        <div className="mt-6 space-y-2.5">
          {/* Tiga baris, tinggi kartu yang sebenarnya. Rangka yang lebih pendek
              daripada isinya membuat halaman melompat begitu isinya datang —
              persis lompatan yang seharusnya dihilangkan. */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-border bg-card"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
