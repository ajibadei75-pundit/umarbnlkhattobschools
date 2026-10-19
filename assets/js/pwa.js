/* Progressive Web App: registers the service worker (HTTPS or localhost only) and offers "Install the app".
   Install uses the browser's own prompt where available; on iPhone/iPad it shows the Add to Home Screen steps. */
(function () {
  "use strict";
  var secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && secure) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {}); });
  }
  var deferred = null, btn = null;
  var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  function show() { btn = btn || document.getElementById("pwa-install"); if (btn && !standalone) btn.hidden = false; }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; show(); });
  window.addEventListener("appinstalled", function () { deferred = null; if (btn) btn.hidden = true; });
  document.addEventListener("DOMContentLoaded", function () {
    btn = document.getElementById("pwa-install"); if (!btn) return;
    if (ios && !standalone) show();
    btn.addEventListener("click", function () {
      if (deferred) { deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; btn.hidden = true; }); }
      else if (ios) { var h = document.getElementById("pwa-hint"); if (h) h.hidden = !h.hidden; }
    });
  });
})();
