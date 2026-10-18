/* Academics page: Nursery / Primary tabs; subjects grouped by area, taken from the shared data. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon;
  var P = U.data().programmes, level = "nursery", GROUPS = ["qa", "core", "creative"];

  function render() {
    var p = P[level];
    var html = '<p class="sec-lead">' + esc(p.desc) + " " + U.draftBadge() + "</p>";
    GROUPS.forEach(function (g) {
      var list = p.subjects.filter(function (s) { return s.g === g; });
      if (!list.length) return;
      html += '<div class="sec-head" style="margin:1.6rem 0 0"><h3 class="sec-title" style="font-size:1.15rem">' + esc(t("sub." + g)) + '</h3><span class="count-line" style="margin:0">' + esc(t("sub.count", { n: list.length })) + "</span></div>" +
        '<div class="subject-grid">' + list.map(function (s) { return '<div class="subject g-' + g + '">' + esc(s.n) + "</div>"; }).join("") + "</div>";
    });
    html += '<div class="two-col" style="margin-top:2rem">' +
      '<article class="panel"><h3><span class="p-ico">' + icon("heart") + "</span>" + esc(t("acad.approach")) + "</h3><p>" + esc(p.approach) + "</p></article>" +
      '<article class="panel"><h3><span class="p-ico">' + icon("users") + "</span>" + esc(t("acad.classes")) + "</h3><p class=\"tbc\" style=\"color:var(--text-muted);font-style:italic\">" + esc(t("acad.classes.empty")) + "</p></article></div>";
    var host = $("#level-panel"); host.innerHTML = html;
    host.setAttribute("aria-labelledby", "tab-" + level);
    host.classList.remove("level-panel"); void host.offsetWidth; host.classList.add("level-panel");
    $$("#level-tabs button").forEach(function (b) { var on = b.getAttribute("data-level") === level; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function pick(l, focus) { level = l; U.store.set("ubk-level", l); render(); if (focus) $("#tab-" + l).focus(); }
  U.init(function () {
    var saved = U.store.get("ubk-level", "nursery"); if (P[saved]) level = saved;
    var m = /level=(nursery|primary|secondary)/.exec(location.hash); if (m) level = m[1];
    $$("#level-tabs button").forEach(function (b) {
      b.addEventListener("click", function () { pick(b.getAttribute("data-level")); });
      b.addEventListener("keydown", function (e) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) < 0) return;
        e.preventDefault(); var order = ["nursery", "primary", "secondary"], i = order.indexOf(level), rtl = document.documentElement.dir === "rtl";
        if (e.key === "Home") i = 0; else if (e.key === "End") i = order.length - 1;
        else i = (i + ((e.key === "ArrowRight") !== rtl ? 1 : -1) + order.length) % order.length;
        pick(order[i], true);
      });
    });
  });
  U.onLang(render);
})();
