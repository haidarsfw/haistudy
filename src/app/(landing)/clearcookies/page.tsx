"use client";

import { useEffect } from "react";
import { Logo } from "@/components/landing/logo";

/**
 * /clearcookies — the reset hatch (netflix.com/clearcookies style).
 *
 * There is no button: arriving here IS the action. It signs the visitor out on
 * the server (the auth cookies are httpOnly, so only the API can clear them),
 * wipes every client-side store — readable cookies, localStorage, sessionStorage,
 * IndexedDB, Cache Storage — and unregisters the service worker (the cached PWA
 * shell), then sends them back to the landing.
 *
 * Point a user here when a stale session or a cached shell is the problem.
 */
export default function ClearCookiesPage() {
  useEffect(() => {
    let finished = false;
    const goHome = () => {
      if (finished) return;
      finished = true;
      // replace() so Back doesn't land them here and re-run the wipe.
      window.location.replace("/");
    };
    // Never strand the visitor if a step hangs (offline, blocked IDB, ...).
    const bail = setTimeout(goHome, 6000);

    void (async () => {
      // 1. Server first — only it can clear the httpOnly auth cookies. Pass what
      //    we know so the presence row gets cleaned up too.
      try {
        let licenseKey: string | undefined;
        try {
          const raw = localStorage.getItem("hs-session-data");
          licenseKey = raw ? JSON.parse(raw)?.licenseKey : undefined;
        } catch {
          /* unreadable session — log out anyway */
        }
        let deviceId: string | undefined;
        try {
          deviceId = localStorage.getItem("hs-device-id") ?? undefined;
        } catch {
          /* ignore */
        }
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseKey, deviceId }),
        });
      } catch {
        /* keep wiping the client even if the network call fails */
      }

      // 2. Any cookie JS can still see (non-httpOnly), across path + domain.
      try {
        for (const entry of document.cookie.split(";")) {
          const name = entry.split("=")[0]?.trim();
          if (!name) continue;
          const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = `${name}=; path=/; ${expire}`;
          document.cookie = `${name}=; path=/; domain=${location.hostname}; ${expire}`;
          document.cookie = `${name}=; path=/; domain=.${location.hostname}; ${expire}`;
        }
      } catch {
        /* ignore */
      }

      // 3. Web storage (settings, theme, cached session, preview flags).
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.clear();
      } catch {
        /* ignore */
      }

      // 4. The PWA: the cached shell and the worker that serves it.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        /* ignore */
      }

      // 5. IndexedDB — best effort; databases() is Chromium-only.
      try {
        const dbs = (await indexedDB.databases?.()) ?? [];
        await Promise.all(
          dbs.map(
            (db) =>
              new Promise<void>((resolve) => {
                if (!db.name) return resolve();
                const req = indexedDB.deleteDatabase(db.name);
                req.onsuccess = req.onerror = req.onblocked = () => resolve();
              })
          )
        );
      } catch {
        /* ignore */
      }

      clearTimeout(bail);
      goHome();
    })();

    return () => clearTimeout(bail);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <Logo markSize={28} wordClassName="text-xl" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Membersihkan data kamu...
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Keluar dari akun, hapus cookie & cache. Sebentar ya.
          </p>
        </div>
        <span
          className="h-1 w-36 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Membersihkan data"
        >
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </span>
      </div>
    </main>
  );
}
