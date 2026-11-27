/* Service worker: makes the site installable and usable offline for pages already opened.
   Rules: only same-origin GET requests and Google Fonts are cached. Anything to the database, sign-in, storage or video
   (other origins) is never touched, so private data is never stored by the worker. BUILD is replaced when the site is packaged. */
const BUILD = "7306992815";
const SHELL = "ubk-shell-" + BUILD, RUNTIME = "ubk-runtime-" + BUILD, FONTS = "ubk-fonts-v1";
const PRECACHE = ["./", "teacher/", "parent/", "student/", "admin/", "bursar/", "about.html", "academics.html", "admin/index.html", "admissions.html", "assets/css/site.css", "assets/data/events.js", "assets/data/faq.js", "assets/data/news.js", "assets/data/site.js", "assets/js/adm.min.js", "assets/js/app.min.js", "assets/js/lib.min.js", "assets/js/p-about.min.js", "assets/js/p-academics.min.js", "assets/js/p-admin.min.js", "assets/js/p-admissions.min.js", "assets/js/p-bursar.min.js", "assets/js/p-contact.min.js", "assets/js/p-events.min.js", "assets/js/p-gallery.min.js", "assets/js/p-index.min.js", "assets/js/p-leadership.min.js", "assets/js/p-learning.min.js", "assets/js/p-news.min.js", "assets/js/p-offline.min.js", "assets/js/p-parent.min.js", "assets/js/p-portals.min.js", "assets/js/p-privacy.min.js", "assets/js/p-student.min.js", "assets/js/p-teacher.min.js", "assets/js/p-track.min.js", "assets/js/theme.js", "bursar/index.html", "contact.html", "events.html", "gallery.html", "index.html", "leadership.html", "learning.html", "manifest.webmanifest", "news.html", "offline.html", "parent/index.html", "portals.html", "privacy.html", "student/index.html", "teacher/index.html", "track.html", "assets/img/logo.jpg", "assets/img/logo-fallback.svg", "assets/icons/icon-192.png", "assets/icons/favicon-48.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("ubk-") && ![SHELL, RUNTIME, FONTS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

async function networkFirstPage(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) { const c = await caches.open(RUNTIME); c.put(req, res.clone()); }
    return res;
  } catch (_) {
    return (await caches.match(req, { ignoreSearch: true })) || (await caches.match("offline.html")) || Response.error();
  }
}
async function staleWhileRevalidate(req, name) {
  const c = await caches.open(name), hit = await c.match(req);
  const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.endsWith("/sw.js")) return;
    if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) { e.respondWith(networkFirstPage(req)); return; }
    e.respondWith(staleWhileRevalidate(req, SHELL).then((r) => r || fetch(req)));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(staleWhileRevalidate(req, FONTS));
  /* every other origin (database, storage, sign-in, video) goes straight to the network */
});

/* Push notifications from the school (announcements).
   Each one gets its own tag so they stack in the tray; Android launchers count them as the number on the app icon
   (like WhatsApp), and we also set the app badge where the browser supports it. */
function paintBadge() {
  return self.registration.getNotifications().then((ns) => {
    const n = ns.length;
    if (self.navigator && self.navigator.setAppBadge) return n ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge();
  }).catch(() => {});
}
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "School announcement", body: e.data ? e.data.text() : "" }; }
  const tag = d.tag || ("ubk-" + Date.now());
  e.waitUntil(self.registration.showNotification(d.title || "School announcement", {
    body: d.body || "", icon: "assets/icons/icon-192.png", badge: "assets/icons/badge-96.png", tag, renotify: true,
    vibrate: [120, 60, 120], timestamp: Date.now(), data: { url: d.url || "./" }
  }).then(paintBadge));
});
self.addEventListener("notificationclose", (e) => { e.waitUntil(paintBadge()); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(paintBadge().then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true })).then((cs) => {
    for (const c of cs) { if ("focus" in c) { c.navigate && c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
