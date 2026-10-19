/* Home page: activity slideshow, latest news and upcoming events. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon, root = document.documentElement;

  /* ---------------- Latest news and upcoming events ---------------- */
  function renderFeed() {
    var nl = $("#home-news"), el = $("#home-events");
    if (nl) {
      var news = U.news(false).slice(0, 3);
      nl.innerHTML = news.length ? news.map(function (n) {
        return '<li><a href="news.html#post=' + esc(n.id) + '"><span class="m-top">' + U.catBadge(n.cat) + (n.sample ? U.sampleBadge() : "") + "</span><strong>" + esc(n.title) + "</strong><time>" +
          esc(U.fmt(U.parseISO(n.date), { day: "numeric", month: "short", year: "numeric" })) + "</time></a></li>";
      }).join("") : '<li class="m-sub">' + esc(t("upd.none.news")) + "</li>";
    }
    if (el) {
      var evs = U.upcoming().slice(0, 3);
      el.innerHTML = evs.length ? evs.map(function (e) {
        var w = U.eventWhen(e);
        return '<li><a class="mini-ev" href="events.html#event=' + esc(e.id) + '"><span class="date-box" aria-hidden="true"><b>' + e.s.getDate() + "</b><span>" + esc(U.fmt(e.s, { month: "short" })) + "</span></span><span><strong>" + esc(e.title) +
          '</strong><span class="m-sub" style="display:block">' + esc(w.time || w.date) + "</span></span></a></li>";
      }).join("") : '<li class="m-sub">' + esc(t("upd.none.events")) + "</li>";
    }
  }

  /* ---------------- Activity slideshow ---------------- */
  var ACTS = [{ id: "morning" }, { id: "quran" }, { id: "sports" }, { id: "arabic" }, { id: "nursery" }, { id: "evening" }];
  var DUR = 6500, actIdx = 0, userPaused = U.reduceMotion, hoverBar = false, focusBar = false, hero;

  function ensure(i) {
    var a = ACTS[(i + ACTS.length) % ACTS.length];
    if (!a.loaded) { a.img.style.backgroundImage = U.actBg(a.id); a.loaded = true; }
  }
  function go(i) {
    i = (i + ACTS.length) % ACTS.length;
    ensure(i); ensure(i + 1);
    ACTS.forEach(function (a, k) {
      var on = k === i;
      a.el.classList.toggle("active", on);
      a.tab.setAttribute("aria-selected", String(on));
      a.tab.tabIndex = on ? 0 : -1;
    });
    actIdx = i;
    var tab = ACTS[i].tab, list = tab.parentNode;
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: tab.offsetLeft - 16, behavior: U.reduceMotion ? "auto" : "smooth" });
    updateActivityText();
  }
  function updateActivityText() {
    ACTS.forEach(function (a) { $(".tab-label", a.tab).textContent = t("act." + a.id); });
    $("#act-title").textContent = t("act." + ACTS[actIdx].id);
    $("#act-desc").textContent = t("act." + ACTS[actIdx].id + ".d");
    applyPause();
  }
  function applyPause() {
    var paused = userPaused || hoverBar || focusBar || document.hidden;
    hero.classList.toggle("is-paused", paused);
    var btn = $("#act-toggle");
    btn.innerHTML = icon(userPaused ? "play" : "pause", 2);
    btn.setAttribute("aria-label", t(userPaused ? "act.play" : "act.pause"));
    btn.title = t(userPaused ? "act.play" : "act.pause");
    $("#act-caption").setAttribute("aria-live", userPaused ? "polite" : "off");
  }
  function initHero() {
    hero = $("#home");
    var slides = $("#hero-slides"), tabs = $("#act-tabs");
    ACTS.forEach(function (a, i) {
      var s = document.createElement("div"); s.className = "slide";
      var im = document.createElement("div"); im.className = "slide-img"; s.appendChild(im); slides.appendChild(s);
      a.el = s; a.img = im;
      var b = document.createElement("button");
      b.type = "button"; b.className = "tab"; b.setAttribute("role", "tab");
      b.innerHTML = '<span class="tab-label"></span><span class="bar" aria-hidden="true"></span>';
      b.addEventListener("click", function () { go(i); });
      b.addEventListener("keydown", function (e) {
        var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
        if (root.dir === "rtl") d = -d;
        e.preventDefault(); go(actIdx + d); ACTS[actIdx].tab.focus();
      });
      tabs.appendChild(b); a.tab = b;
    });
    hero.style.setProperty("--dur", DUR + "ms");
    $("#act-prev").innerHTML = icon("prev", 2); $("#act-next").innerHTML = icon("next", 2);
    $("#act-prev").addEventListener("click", function () { go(actIdx - 1); });
    $("#act-next").addEventListener("click", function () { go(actIdx + 1); });
    $("#act-toggle").addEventListener("click", function () { userPaused = !userPaused; applyPause(); });
    /* the progress bar on the active tab drives auto-advance */
    tabs.addEventListener("animationend", function (e) { if (e.animationName === "fill") go(actIdx + 1); });
    var bar = $("#act-bar");
    bar.addEventListener("mouseenter", function () { hoverBar = true; applyPause(); });
    bar.addEventListener("mouseleave", function () { hoverBar = false; applyPause(); });
    bar.addEventListener("focusin", function () { focusBar = true; applyPause(); });
    bar.addEventListener("focusout", function () { focusBar = false; applyPause(); });
    document.addEventListener("visibilitychange", applyPause);
    var x0 = null;
    hero.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) go(actIdx + (dx < 0 ? 1 : -1) * (root.dir === "rtl" ? -1 : 1));
    }, { passive: true });
    go(0);
  }

  U.init(function () {
    initHero();
  });
  U.onLang(function () { renderFeed(); updateActivityText(); });
})();
