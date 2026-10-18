/* Loaded synchronously in <head> so the right theme, language and direction are set before first paint. */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  var boot = window.__UBK || {};            /* set by the preview shell when storage is unavailable */
  var t = boot.theme, l = boot.lang;
  try { t = localStorage.getItem("ubk-theme") || t; l = localStorage.getItem("ubk-lang") || l; } catch (e) {}
  if (["light", "dark", "system"].indexOf(t) < 0) t = "system";
  if (["en", "ar", "ha"].indexOf(l) < 0) l = "en";
  d.setAttribute("data-theme", t);
  d.setAttribute("lang", l);
  d.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
  window.UBK_BOOT = { theme: t, lang: l };
})();
