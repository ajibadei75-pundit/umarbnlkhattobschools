/* Service worker: makes the site installable and usable offline for pages already opened.
   Rules: only same-origin GET requests and Google Fonts are cached. Anything to the database, sign-in, storage or video
   (other origins) is never touched, so private data is never stored by the worker. BUILD is replaced when the site is packaged. */
const BUILD = "d9967e1096";
const SHELL = "ubk-shell-" + BUILD, RUNTIME = "ubk-runtime-" + BUILD, FONTS = "ubk-fonts-v1";
const PRECACHE = ["./", "about.html", "academics.html", "admin.html", "admissions.html", "assets/css/pages.css", "assets/css/styles.css", "assets/css/tokens.css", "assets/data/events.js", "assets/data/faq.js", "assets/data/news.js", "assets/data/site.js", "assets/js/about.js", "assets/js/academics.js", "assets/js/admin-ai.js", "assets/js/admin-content.js", "assets/js/admin-finance.js", "assets/js/admin-learning.js", "assets/js/admin-people.js", "assets/js/admin-results.js", "assets/js/admin-setup.js", "assets/js/admin.js", "assets/js/admissions.js", "assets/js/backend.js", "assets/js/contact.js", "assets/js/content.js", "assets/js/core.js", "assets/js/data.js", "assets/js/events.js", "assets/js/gallery.js", "assets/js/home.js", "assets/js/i18n-admissions.js", "assets/js/i18n-learning.js", "assets/js/i18n-pages.js", "assets/js/i18n-parent.js", "assets/js/i18n-public.js", "assets/js/i18n.js", "assets/js/leadership.js", "assets/js/learning.js", "assets/js/news.js", "assets/js/offline.js", "assets/js/parent.js", "assets/js/public.js", "assets/js/pwa.js", "assets/js/report-sheet.js", "assets/js/site-config.js", "assets/js/theme.js", "assets/js/track.js", "contact.html", "events.html", "gallery.html", "index.html", "leadership.html", "learning.html", "manifest.webmanifest", "news.html", "offline.html", "parent.html", "privacy.html", "track.html", "assets/img/logo.jpg", "assets/img/logo-fallback.svg", "assets/icons/icon-192.png", "assets/icons/favicon-48.png"];

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
