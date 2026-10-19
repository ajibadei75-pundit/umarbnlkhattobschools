/* Core: everything shared by every page. Exposes window.UBK for the page scripts. */
(function () {
  "use strict";
  var root = document.documentElement;
  var T = window.UBK_I18N;
  var BOOT = window.UBK_BOOT || {};
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var store = {
    get: function (k, f) { try { return localStorage.getItem(k) || f; } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function t(k, v) {
    var l = root.lang, s = (T[l] && T[l][k]) || T.en[k] || k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split("{" + n + "}").join(v[n]); });
    return s;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------------- Dates ---------------- */
  var LOCALES = { en: "en-NG", ar: "ar-u-nu-latn", ha: "ha-NG" };
  function fmt(d, o) {
    try { return new Intl.DateTimeFormat(LOCALES[root.lang] || "en", o).format(d); }
    catch (e) { return new Intl.DateTimeFormat("en", o).format(d); }
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function toISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function timeText(hhmm) {
    if (!hhmm) return "";
    var p = hhmm.split(":"), d = new Date(2000, 0, 1, +p[0], +p[1]);
    return fmt(d, { hour: "numeric", minute: "2-digit" });
  }

  /* ---------------- Shared content helpers (news, events) ---------------- */
  function D() { return window.UBK_DATA || {}; }
  function newsVisible(withArchived) {
    var td = today();
    return (D().news || []).filter(function (n) {
      return parseISO(n.publishAt || n.date) <= td && (withArchived || !n.archived);
    }).sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return parseISO(b.date) - parseISO(a.date);
    });
  }
  function eventsAll() {
    return (D().events || []).map(function (e) {
      var o = {}; Object.keys(e).forEach(function (k) { o[k] = e[k]; });
      o.s = parseISO(e.start); o.e = parseISO(e.end || e.start); return o;
    }).sort(function (a, b) { return a.s - b.s; });
  }
  function eventsUpcoming() { var td = today(); return eventsAll().filter(function (e) { return e.e >= td; }); }
  function eventWhen(e) {
    var one = toISO(e.s) === toISO(e.e), s = e.s;
    var date = one ? fmt(s, { weekday: "short", day: "numeric", month: "long", year: "numeric" })
      : fmt(s, { day: "numeric", month: "short" }) + " – " + fmt(e.e, { day: "numeric", month: "short", year: "numeric" });
    var time = e.time ? timeText(e.time) + (e.endTime ? " – " + timeText(e.endTime) : "") : (one ? t("ev.allday") : "");
    return { date: date, time: time };
  }
  function catBadge(c) { return '<span class="cat-badge cat-' + esc(c) + '">' + esc(t("cat." + c)) + "</span>"; }
  function sampleBadge() { return '<span class="sample-badge">' + esc(t("sample.badge")) + "</span>"; }
  function draftBadge() { return '<span class="draft-badge">' + esc(t("draft.badge")) + "</span>"; }

  /* ---------------- Icons ---------------- */
  var SVG = {
    school: '<path d="M3 10l9-6 9 6v1H3z"/><path d="M5 11v8M9 11v8M15 11v8M19 11v8M3 20h18"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    teacher: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20l4-4 4 4M7 9h6M7 12h4"/>',
    family: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.6 6 5.5"/>',
    book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v13"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M8 5l11 7-11 7z"/>', up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
    pin: '<path d="M9 4h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 15v6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mappin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    print: '<path d="M7 9V3h10v6M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', check: '<path d="M5 12l5 5 9-10"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    news: '<path d="M5 4h11v16H7a2 2 0 01-2-2z"/><path d="M16 8h3v10a2 2 0 01-2 2M8 8h5M8 12h5M8 16h3"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3 3 0 010 6M18 14c2 .8 3 2.6 3 6"/>',
    building: '<path d="M4 21V5l8-2 8 2v16M4 21h16M9 9h2M13 9h2M9 13h2M13 13h2M10 21v-4h4v4"/>'
  };
  function icon(name, sw) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (SVG[name] || "") + "</svg>";
  }
  function injectIcons(scope) {
    $$("[data-icon]", scope).forEach(function (el) { if (SVG[el.getAttribute("data-icon")] && !el.firstChild) el.innerHTML = icon(el.getAttribute("data-icon")); });
  }

  /* ---------------- Scroll reveal ---------------- */
  var ro = null;
  function reveal(el) { if (ro) ro.observe(el); else el.classList.add("in"); }
  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    ro = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); ro.unobserve(x.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (e) { ro.observe(e); });
  }

  /* ---------------- Theme (Light / Night / System) ---------------- */
  var MODES = ["light", "dark", "system"], MODE_ICON = { light: "sun", dark: "moon", system: "system" };
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function resolvedDark() { var m = root.getAttribute("data-theme"); return m === "dark" || (m === "system" && darkQuery && darkQuery.matches); }
  function syncMeta() { var m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", resolvedDark() ? "#1a1350" : "#302078"); }
  function buildThemeSwitchers() {
    $$(".theme-seg").forEach(function (seg) {
      seg.innerHTML = "";
      MODES.forEach(function (mode) {
        var b = document.createElement("button");
        b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("data-mode", mode);
        b.innerHTML = icon(MODE_ICON[mode], 2) + '<span class="lbl"></span>';
        b.addEventListener("click", function () { setTheme(mode); });
        b.addEventListener("keydown", function (e) {
          var dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (!dir) return;
          if (root.dir === "rtl" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) dir = -dir;
          e.preventDefault();
          var next = MODES[(MODES.indexOf(mode) + dir + MODES.length) % MODES.length];
          setTheme(next);
          var nb = $('button[data-mode="' + next + '"]', seg); if (nb) nb.focus();
        });
        seg.appendChild(b);
      });
    });
    refreshTheme();
  }
  function refreshTheme() {
    var cur = root.getAttribute("data-theme");
    $$(".theme-seg").forEach(function (seg) {
      seg.style.setProperty("--idx", MODES.indexOf(cur));
      $$("button", seg).forEach(function (b) {
        var m = b.getAttribute("data-mode"), on = m === cur;
        b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1;
        b.title = t("theme." + m); b.setAttribute("aria-label", t("theme." + m));
        $(".lbl", b).textContent = t("theme.s." + m);
      });
    });
    syncMeta();
  }
  function setTheme(mode) { root.setAttribute("data-theme", mode); BOOT.theme = mode; store.set("ubk-theme", mode); refreshTheme(); }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", syncMeta);

  /* ---------------- Language / RTL ---------------- */
  var inits = [], langCbs = [];
  function applyI18n(scope) {
    $$("[data-i18n]", scope).forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-attr]", scope).forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":"); el.setAttribute(p[0], t(p[1]));
      });
    });
  }
  function setLang(l) {
    root.lang = l; root.dir = l === "ar" ? "rtl" : "ltr"; BOOT.lang = l; store.set("ubk-lang", l);
    applyI18n();
    $$(".lang-select").forEach(function (s) { s.value = l; });
    var key = root.getAttribute("data-title-key");
    document.title = key ? t(key) + " | " + t("school") : t("school");
    refreshTheme(); renderNextLinks(); renderFooterContact();
    langCbs.forEach(function (fn) { fn(l); });
    injectIcons();
  }

  /* ---------------- "Continue exploring" links and footer contact ---------------- */
  var PAGE_META = { admissions: ["pg.admissions", "admissions.html", "school"], about: ["pg.about", "about.html", "building"], academics: ["pg.academics", "academics.html", "book"], news: ["pg.news", "news.html", "news"],
    events: ["pg.events", "events.html", "calendar"], contact: ["pg.contact", "contact.html", "chat"],
    gallery: ["pg.gallery", "gallery.html", "grid"], leadership: ["pg.leadership", "leadership.html", "users"] };
  function renderNextLinks() {
    $$("[data-next]").forEach(function (host) {
      host.innerHTML = host.getAttribute("data-next").split(",").map(function (k) {
        var p = PAGE_META[k]; if (!p) return "";
        return '<a class="next-card" href="' + p[1] + '"><span class="nc-ico">' + icon(p[2]) + '</span><span class="nc-txt"><strong>' + esc(t(p[0])) + "</strong><small>" + esc(t(p[0] + ".d")) + '</small></span><span class="nc-go">' + icon("arrow", 2) + "</span></a>";
      }).join("");
    });
  }
  function renderFooterContact() {
    var host = $("#footer-contact"); if (!host) return;
    var s = window.UBK_SITE || {}, rows = [];
    function row(ic, label, val) { rows.push('<li>' + icon(ic) + "<span>" + esc(label) + ": " + val + "</span></li>"); }
    var tbc = '<em>' + esc(t("con.none.footer")) + "</em>";
    var A = s.admissions || {};
    if (A.tel) rows.push('<li>' + icon("phone") + "<span><strong>" + esc(t("adm.desk")) + ':</strong> <a href="tel:' + esc(A.tel) + '" dir="ltr">' + esc(A.phone) + "</a></span></li>");
    row("mappin", t("con.address"), s.address ? esc(s.address) : tbc);
    if (s.phones && s.phones.length) row("phone", t("con.phone"), s.phones.map(function (p) { return '<a href="tel:' + esc(p.replace(/[^+\d]/g, "")) + '">' + esc(p) + "</a>"; }).join(", "));
    row("mail", t("con.email"), s.email ? '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a>" : tbc);
    host.innerHTML = rows.join("");
  }

  /* ---------------- Dialogs ---------------- */
  function dialog(dlg, onClose) {
    if (!dlg || dlg._wired) return;
    dlg._wired = true;
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
    dlg.addEventListener("close", function () { document.body.classList.remove("dlg-open"); if (onClose) onClose(); });
  }
  function openDialog(dlg) {
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    document.body.classList.add("dlg-open");
  }
  function clearHash() {
    try { history.replaceState(null, "", location.pathname + location.search); }
    catch (e) { try { location.hash = ""; } catch (e2) {} }
  }
  function printHTML(html) {
    var area = $("#print-area");
    if (!area) { area = document.createElement("div"); area.id = "print-area"; document.body.appendChild(area); }
    area.innerHTML = html; document.body.classList.add("printing");
    setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove("printing"); area.innerHTML = ""; }, 300); }, 60);
  }
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s);
    return new Promise(function (res, rej) {
      var ta = document.createElement("textarea"); ta.value = s; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); }
      document.body.removeChild(ta);
    });
  }
  function download(name, mime, text) {
    var blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ---------------- Activity pictures (home slideshow and About gallery) ---------------- */
  function actBg(id) {
    var o = (window.UBK_ACT_IMG || {})[id] || ((window.UBK_SITE || {}).activityPhotos || {})[id];
    return 'url("' + (o || "assets/img/activities/" + id + ".svg") + '")';
  }

  /* ---------------- Header: dropdown, mobile menu, scroll state, back-to-top ---------------- */
  function initDropdowns() {
    var hoverCapable = !!(window.matchMedia && window.matchMedia("(hover: hover) and (min-width: 1241px)").matches);
    $$(".nav-dd").forEach(function (dd) {
      var btn = $(".dd-btn", dd), timer;
      function set(o) { dd.classList.toggle("open", o); btn.setAttribute("aria-expanded", String(o)); }
      btn.addEventListener("click", function (e) { e.stopPropagation(); set(hoverCapable ? true : !dd.classList.contains("open")); });
      if (hoverCapable) {
        dd.addEventListener("mouseenter", function () { clearTimeout(timer); set(true); });
        dd.addEventListener("mouseleave", function () { timer = setTimeout(function () { set(false); }, 160); });
      }
      dd.addEventListener("keydown", function (e) { if (e.key === "Escape") { set(false); btn.focus(); } });
      dd.addEventListener("focusout", function (e) { if (e.relatedTarget && !dd.contains(e.relatedTarget)) set(false); });
      document.addEventListener("click", function (e) { if (!dd.contains(e.target)) set(false); });
    });
  }
  function initNav() {
    var nav = $("#nav"), tg = $("#menu-toggle");
    tg.addEventListener("click", function () { var o = nav.classList.toggle("open"); tg.setAttribute("aria-expanded", String(o)); });
    nav.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a) { nav.classList.remove("open"); tg.setAttribute("aria-expanded", "false"); }
    });
    initDropdowns();
    /* on the home page, highlight the nav item for the section being read */
    var spies = $$("[data-spy]").map(function (el) { return { el: el, sec: document.getElementById(el.getAttribute("data-spy")) }; }).filter(function (x) { return x.sec; });
    if (spies.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!x.isIntersecting) return;
          spies.forEach(function (s) {
            var on = s.sec === x.target;
            if (s.el.tagName === "A") s.el.setAttribute("aria-current", on ? "true" : "false"); else s.el.classList.toggle("is-current", on);
          });
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      spies.forEach(function (s) { io.observe(s.sec); });
    }
  }
  function initScroll() {
    var h = $(".site-header"), bar = $(".progress"), top = $("#to-top"), busy = false;
    function upd() {
      busy = false;
      var y = window.scrollY || 0, max = document.documentElement.scrollHeight - window.innerHeight;
      h.classList.toggle("scrolled", y > 8);
      top.classList.toggle("show", y > 700);
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }
    window.addEventListener("scroll", function () { if (!busy) { busy = true; requestAnimationFrame(upd); } }, { passive: true });
    top.innerHTML = icon("up", 2);
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
    upd();
  }

  /* ---------------- Search ---------------- */
  var SEARCH_PAGES = [["pg.admissions", "admissions.html"], ["pg.track", "track.html"], ["pg.about", "about.html"], ["pg.academics", "academics.html"], ["pg.news", "news.html"], ["pg.events", "events.html"], ["pg.contact", "contact.html"], ["nav.learning", "learning.html"]];
  var SEARCH_HOME = [["nav.admin", "index.html#admin", "sec.admin.d"], ["nav.teacher", "index.html#teacher", "sec.teacher.d"], ["nav.parent", "parent.html", "sec.parent.d"], ["nav.learning", "index.html#learning", "sec.learning.d"]];
  function searchIndex() {
    var out = [];
    SEARCH_PAGES.forEach(function (p) { out.push({ g: "pages", title: t(p[0]), text: t(p[0] + ".d"), url: p[1] }); });
    SEARCH_HOME.forEach(function (p) { out.push({ g: "pages", title: t(p[0]), text: t(p[2]), url: p[1] }); });
    newsVisible(false).forEach(function (n) { out.push({ g: "news", title: n.title, text: n.excerpt + " " + (n.body || []).join(" "), url: "news.html#post=" + n.id }); });
    eventsUpcoming().forEach(function (e) { out.push({ g: "events", title: e.title, text: e.description || "", url: "events.html#event=" + e.id }); });
    (D().faqs || []).forEach(function (f) { out.push({ g: "faq", title: f.q, text: f.a, url: "contact.html#faq-" + f.id }); });
    return out;
  }
  function initSearch() {
    var dlg = $("#search-dlg"), input = $("#search-input"), box = $("#search-results"), items = [], active = -1;
    if (!dlg) return;
    dialog(dlg);
    function render() {
      var q = input.value.trim().toLowerCase(), idx = searchIndex(), res;
      if (!q) res = idx.filter(function (x) { return x.g === "pages"; });
      else {
        var toks = q.split(/\s+/);
        res = idx.map(function (x) {
          var title = x.title.toLowerCase(), all = title + " " + x.text.toLowerCase(), ok = toks.every(function (k) { return all.indexOf(k) > -1; });
          return ok ? { x: x, s: toks.every(function (k) { return title.indexOf(k) > -1; }) ? 2 : 1 } : null;
        }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).map(function (r) { return r.x; }).slice(0, 12);
      }
      items = []; var html = "";
      if (!res.length) html = '<p class="search-empty">' + esc(t("search.empty")) + "</p>";
      ["pages", "news", "events", "faq"].forEach(function (g) {
        var part = res.filter(function (x) { return x.g === g; }); if (!part.length) return;
        html += '<div class="sr-group"><h3>' + esc(t("search.g." + g)) + "</h3>";
        part.forEach(function (x) {
          html += '<a class="sr-item" role="option" aria-selected="false" id="sr-' + items.length + '" href="' + esc(x.url) + '"><strong>' + esc(x.title) + "</strong>" + (x.text ? "<small>" + esc(x.text.slice(0, 110)) + "</small>" : "") + "</a>";
          items.push(x);
        });
        html += "</div>";
      });
      box.innerHTML = html; active = -1;
    }
    function mark(i) {
      var els = $$(".sr-item", box); if (!els.length) return;
      active = (i + els.length) % els.length;
      els.forEach(function (e, k) { e.setAttribute("aria-selected", String(k === active)); });
      els[active].scrollIntoView({ block: "nearest" });
    }
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); mark(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); mark(active - 1); }
      else if (e.key === "Enter") { var els = $$(".sr-item", box); var el = els[active > -1 ? active : 0]; if (el) { e.preventDefault(); el.click(); } }
    });
    box.addEventListener("click", function (e) { if (e.target.closest("a")) dlg.close(); });
    function open() { input.value = ""; render(); openDialog(dlg); setTimeout(function () { input.focus(); }, 30); }
    $$(".js-search-open").forEach(function (b) { b.addEventListener("click", open); });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
      if ((e.key === "/" && !typing && !dlg.open) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); open(); }
    });
  }

  /* ---------------- Boot ---------------- */
  window.UBK = {
    root: root, $: $, $$: $$, t: t, esc: esc, store: store, icon: icon, injectIcons: injectIcons, reveal: reveal, reduceMotion: reduceMotion,
    fmt: fmt, toISO: toISO, parseISO: parseISO, today: today, timeText: timeText,
    news: newsVisible, events: eventsAll, upcoming: eventsUpcoming, eventWhen: eventWhen, catBadge: catBadge, sampleBadge: sampleBadge, draftBadge: draftBadge,
    dialog: dialog, openDialog: openDialog, clearHash: clearHash, printHTML: printHTML, copyText: copyText, download: download, actBg: actBg,
    data: D, site: function () { return window.UBK_SITE || {}; },
    init: function (fn) { inits.push(fn); }, onLang: function (fn) { langCbs.push(fn); },
    refresh: function () { setLang(root.lang); }, setLang: setLang, applyI18n: applyI18n
  };
  document.addEventListener("DOMContentLoaded", function () {
    injectIcons();
    buildThemeSwitchers();
    $$(".lang-select").forEach(function (s) { s.addEventListener("change", function () { setLang(s.value); }); });
    var img = $(".brand-logo");
    if (img) img.addEventListener("error", function () { img.onerror = null; img.src = "assets/img/logo-fallback.svg"; });
    initNav(); initScroll(); initReveal(); initSearch();
    inits.forEach(function (fn) { fn(); });
    setLang(root.getAttribute("lang") || "en");
  });
})();
