/* haistudy service worker - multi-channel notifications */

const SW_VERSION = "v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* ───────── push: receive payload, suppress if active+focused, else show ───────── */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (_e) {
    payload = { title: "haistudy", body: event.data.text() };
  }

  // Silent action: e.g. read-receipt sync from server → close notification, no UI
  if (payload.data && payload.data.action === "clear" && payload.data.tag) {
    event.waitUntil(
      self.registration
        .getNotifications({ tag: payload.data.tag })
        .then((ns) => ns.forEach((n) => n.close()))
    );
    return;
  }

  event.waitUntil(
    (async () => {
      const deepLinkPath = (payload.data && payload.data.deepLink) || "/";
      const pathname = deepLinkPath.split("?")[0];

      // Suppression: if any client window has the conversation open AND is focused,
      // forward the payload to that client and skip the OS notification.
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const active = allClients.find(
        (c) =>
          c.focused &&
          c.visibilityState === "visible" &&
          c.url.indexOf(pathname) !== -1
      );
      if (active) {
        active.postMessage({ type: "support:incoming", payload });
        return;
      }

      // Forward to ALL clients so in-app toast/sound layer can update inline (the
      // client decides whether to render based on its own active-thread state).
      for (const c of allClients) {
        c.postMessage({ type: "support:incoming", payload });
      }

      await self.registration.showNotification(payload.title || "haistudy", {
        body: payload.body || "",
        tag: payload.tag || "support",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        data: payload.data || {},
        renotify: true,
        // requireInteraction defaults to false - auto-dismiss after a few sec
      });
    })()
  );
});

/* ───────── notificationclick: focus or open deep link ───────── */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.deepLink) || "/";

  event.waitUntil(
    (async () => {
      const url = new URL(target, self.location.origin);
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Prefer existing client on the same path; tell it to navigate (handles ?lk param)
      const existing =
        all.find((c) => c.url.indexOf(url.pathname) !== -1) || all[0];
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: "support:navigate", target });
        return;
      }
      await self.clients.openWindow(target);
    })()
  );
});

/* ───────── pushsubscriptionchange: re-subscribe transparently ───────── */

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldSub = event.oldSubscription;
        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            (oldSub && oldSub.options && oldSub.options.applicationServerKey) ||
            undefined,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: newSub.endpoint,
            keys: newSub.toJSON().keys,
            replacedEndpoint: oldSub ? oldSub.endpoint : null,
          }),
        });
      } catch (_e) {
        /* swallow - next page-load re-subscribes */
      }
    })()
  );
});

/* ───────── message: in-app code asks SW to close stale notifications ───────── */

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "clearNotifs" && data.tag) {
    self.registration
      .getNotifications({ tag: data.tag })
      .then((ns) => ns.forEach((n) => n.close()));
  }
  if (data.type === "skipWaiting") {
    self.skipWaiting();
  }
});
